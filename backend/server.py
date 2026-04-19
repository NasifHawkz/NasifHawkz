from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, WebSocket, WebSocketDisconnect, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import bcrypt
import jwt
import secrets
from pydantic import BaseModel
from typing import Dict, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"

def get_jwt_secret():
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    return jwt.encode(
        {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"},
        get_jwt_secret(), algorithm=JWT_ALGORITHM
    )

def create_refresh_token(user_id: str) -> str:
    return jwt.encode(
        {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "refresh"},
        get_jwt_secret(), algorithm=JWT_ALGORITHM
    )

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

async def get_user_from_token(token: str):
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            return None
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except Exception:
        return None


class ConnectionManager:
    def __init__(self):
        self.connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, ws: WebSocket, couple_id: str, user_id: str):
        await ws.accept()
        if couple_id not in self.connections:
            self.connections[couple_id] = {}
        self.connections[couple_id][user_id] = ws
        await self.send_to_partner(couple_id, user_id, {"type": "partner_online", "user_id": user_id})

    def disconnect(self, couple_id: str, user_id: str):
        if couple_id in self.connections:
            self.connections[couple_id].pop(user_id, None)
            if not self.connections[couple_id]:
                del self.connections[couple_id]

    async def send_to_partner(self, couple_id: str, sender_id: str, msg: dict):
        if couple_id in self.connections:
            for uid, ws in list(self.connections[couple_id].items()):
                if uid != sender_id:
                    try:
                        await ws.send_json(msg)
                    except Exception:
                        pass

    def is_partner_online(self, couple_id: str, user_id: str) -> bool:
        if couple_id in self.connections:
            return any(uid != user_id for uid in self.connections[couple_id])
        return False


manager = ConnectionManager()
app = FastAPI()
api_router = APIRouter(prefix="/api")


class RegisterReq(BaseModel):
    email: str
    password: str
    name: str

class LoginReq(BaseModel):
    email: str
    password: str

class PairReq(BaseModel):
    pairing_code: str

class WatchlistReq(BaseModel):
    title: str
    platform: str = "Netflix"
    image_url: str = ""
    notes: str = ""


def set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie("access_token", access_token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    response.set_cookie("refresh_token", refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")


def user_response(user_doc, token=None):
    uid = user_doc.get("_id", user_doc.get("id", ""))
    if isinstance(uid, ObjectId):
        uid = str(uid)
    return {
        "id": uid,
        "email": user_doc["email"],
        "name": user_doc["name"],
        "pairing_code": user_doc.get("pairing_code", ""),
        "partner_id": user_doc.get("partner_id"),
        "couple_id": user_doc.get("couple_id"),
        "token": token,
    }


@api_router.post("/auth/register")
async def register(req: RegisterReq, response: Response):
    email = req.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    pairing_code = secrets.token_hex(4).upper()
    doc = {
        "email": email,
        "password_hash": hash_password(req.password),
        "name": req.name,
        "partner_id": None,
        "couple_id": None,
        "pairing_code": pairing_code,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    result = await db.users.insert_one(doc)
    uid = str(result.inserted_id)
    at = create_access_token(uid, email)
    rt = create_refresh_token(uid)
    set_auth_cookies(response, at, rt)
    doc["_id"] = uid
    return user_response(doc, at)


@api_router.post("/auth/login")
async def login(req: LoginReq, response: Response):
    email = req.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(401, "Invalid credentials")
    uid = str(user["_id"])
    at = create_access_token(uid, email)
    rt = create_refresh_token(uid)
    set_auth_cookies(response, at, rt)
    return user_response(user, at)


@api_router.get("/auth/me")
async def get_me(request: Request, response: Response):
    user = await get_current_user(request)
    at = create_access_token(user["_id"], user["email"])
    response.set_cookie("access_token", at, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    return user_response(user, at)


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(401, "No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(401, "User not found")
        uid = str(user["_id"])
        at = create_access_token(uid, user["email"])
        response.set_cookie("access_token", at, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
        return {"token": at}
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expired")


@api_router.get("/partner/code")
async def get_code(request: Request):
    user = await get_current_user(request)
    return {"pairing_code": user.get("pairing_code", "")}


@api_router.post("/partner/pair")
async def pair(req: PairReq, request: Request):
    user = await get_current_user(request)
    if user.get("partner_id"):
        raise HTTPException(400, "Already paired with a partner")
    partner = await db.users.find_one({"pairing_code": req.pairing_code.upper().strip()})
    if not partner:
        raise HTTPException(404, "Invalid pairing code")
    pid = str(partner["_id"])
    if pid == user["_id"]:
        raise HTTPException(400, "Cannot pair with yourself")
    if partner.get("partner_id"):
        raise HTTPException(400, "This person is already paired")
    couple_id = secrets.token_hex(8)
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": {"partner_id": pid, "couple_id": couple_id}})
    await db.users.update_one({"_id": ObjectId(pid)}, {"$set": {"partner_id": user["_id"], "couple_id": couple_id}})
    return {"message": "Paired successfully!", "partner_name": partner["name"], "couple_id": couple_id}


@api_router.get("/partner/info")
async def partner_info(request: Request):
    user = await get_current_user(request)
    if not user.get("partner_id"):
        return {"paired": False}
    partner = await db.users.find_one({"_id": ObjectId(user["partner_id"])}, {"_id": 0, "password_hash": 0})
    if not partner:
        return {"paired": False}
    online = manager.is_partner_online(user.get("couple_id", ""), user["_id"])
    return {"paired": True, "partner_name": partner["name"], "is_online": online, "couple_id": user.get("couple_id")}


@api_router.post("/partner/unpair")
async def unpair(request: Request):
    user = await get_current_user(request)
    if not user.get("partner_id"):
        raise HTTPException(400, "Not paired")
    await db.users.update_one({"_id": ObjectId(user["_id"])}, {"$set": {"partner_id": None, "couple_id": None}})
    await db.users.update_one({"_id": ObjectId(user["partner_id"])}, {"$set": {"partner_id": None, "couple_id": None}})
    return {"message": "Unpaired"}


@api_router.get("/watchlist")
async def get_watchlist(request: Request):
    user = await get_current_user(request)
    if not user.get("couple_id"):
        return []
    return await db.watchlist.find({"couple_id": user["couple_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api_router.post("/watchlist")
async def add_watchlist(item: WatchlistReq, request: Request):
    user = await get_current_user(request)
    if not user.get("couple_id"):
        raise HTTPException(400, "Not paired yet")
    doc = {
        "id": secrets.token_hex(8),
        "couple_id": user["couple_id"],
        "title": item.title,
        "platform": item.platform,
        "image_url": item.image_url,
        "notes": item.notes,
        "added_by": user["name"],
        "status": "want_to_watch",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.watchlist.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/watchlist/{item_id}")
async def update_watchlist(item_id: str, request: Request):
    user = await get_current_user(request)
    body = await request.json()
    await db.watchlist.update_one(
        {"id": item_id, "couple_id": user.get("couple_id")},
        {"$set": {"status": body.get("status", "want_to_watch")}},
    )
    return {"message": "Updated"}


@api_router.delete("/watchlist/{item_id}")
async def delete_watchlist(item_id: str, request: Request):
    user = await get_current_user(request)
    await db.watchlist.delete_one({"id": item_id, "couple_id": user.get("couple_id")})
    return {"message": "Deleted"}


@api_router.get("/messages")
async def get_messages(request: Request, limit: int = 50):
    user = await get_current_user(request)
    if not user.get("couple_id"):
        return []
    msgs = await db.messages.find({"couple_id": user["couple_id"]}, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    msgs.reverse()
    return msgs


@app.websocket("/api/ws")
async def ws_endpoint(websocket: WebSocket, token: str = Query(...)):
    user = await get_user_from_token(token)
    if not user or not user.get("couple_id"):
        await websocket.close(code=4001)
        return
    couple_id = user["couple_id"]
    user_id = user["_id"]
    user_name = user["name"]
    await manager.connect(websocket, couple_id, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "chat_message":
                msg = {
                    "id": secrets.token_hex(8),
                    "couple_id": couple_id,
                    "sender_id": user_id,
                    "sender_name": user_name,
                    "content": data.get("content", ""),
                    "message_type": data.get("message_type", "text"),
                    "reactions": [],
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
                await db.messages.insert_one(msg)
                msg.pop("_id", None)
                await manager.send_to_partner(couple_id, user_id, {"type": "chat_message", **msg})
                await websocket.send_json({"type": "chat_message", **msg})
            elif msg_type == "reaction":
                mid = data.get("message_id")
                emoji = data.get("emoji")
                await db.messages.update_one(
                    {"id": mid},
                    {"$addToSet": {"reactions": {"emoji": emoji, "user_id": user_id}}},
                )
                payload = {"type": "reaction", "message_id": mid, "emoji": emoji, "user_id": user_id}
                await manager.send_to_partner(couple_id, user_id, payload)
                await websocket.send_json(payload)
            else:
                await manager.send_to_partner(couple_id, user_id, {**data, "sender_id": user_id, "sender_name": user_name})
    except WebSocketDisconnect:
        manager.disconnect(couple_id, user_id)
        await manager.send_to_partner(couple_id, user_id, {"type": "partner_offline", "user_id": user_id})
    except Exception as e:
        logger.error(f"WS error: {e}")
        manager.disconnect(couple_id, user_id)


@api_router.get("/")
async def root():
    return {"message": "DuoWatch API"}


app.include_router(api_router)

frontend_url = os.environ.get("FRONTEND_URL", "")
cors_origins = os.environ.get("CORS_ORIGINS", "")
origins = [o.strip() for o in f"{frontend_url},{cors_origins}".split(",") if o.strip() and o.strip() != "*"]
if not origins:
    origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True if origins != ["*"] else False,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("pairing_code")
    await db.messages.create_index("couple_id")
    await db.watchlist.create_index("couple_id")
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Admin",
            "role": "admin",
            "partner_id": None,
            "couple_id": None,
            "pairing_code": secrets.token_hex(4).upper(),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    os.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"# Test Credentials\n\n## Admin\n- Email: {admin_email}\n- Password: {admin_password}\n\n")
        f.write("## Auth Endpoints\n- POST /api/auth/register\n- POST /api/auth/login\n- GET /api/auth/me\n- POST /api/auth/logout\n")
        f.write("- POST /api/auth/refresh\n- GET /api/partner/code\n- POST /api/partner/pair\n- GET /api/partner/info\n")
        f.write("- GET /api/watchlist\n- POST /api/watchlist\n- WS /api/ws?token=xxx\n")


@app.on_event("shutdown")
async def shutdown():
    client.close()
