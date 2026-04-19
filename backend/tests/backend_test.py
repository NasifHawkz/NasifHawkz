"""Backend API tests for DuoWatch couples app.
Covers: auth, partner pairing, watchlist CRUD, messages.
"""
import os
import secrets
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://duo-watch-connect.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ALICE = {"email": "alice@test.com", "password": "test123"}
BOB = {"email": "bob@test.com", "password": "test123"}


# --- helpers ---
def _login(creds):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json=creds, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    return s, r.json()


@pytest.fixture(scope="module")
def alice_session():
    s, data = _login(ALICE)
    return s, data


@pytest.fixture(scope="module")
def bob_session():
    s, data = _login(BOB)
    return s, data


# --- health ---
class TestHealth:
    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200
        assert "message" in r.json()


# --- auth ---
class TestAuth:
    def test_login_success_alice(self):
        s, data = _login(ALICE)
        assert data["email"] == ALICE["email"]
        assert data["token"]
        assert data["id"]

    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ALICE["email"], "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_login_unknown_user(self):
        r = requests.post(f"{API}/auth/login", json={"email": "nope@x.com", "password": "x"}, timeout=10)
        assert r.status_code == 401

    def test_me_with_token(self, alice_session):
        s, data = alice_session
        r = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == ALICE["email"]

    def test_me_without_auth(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_register_duplicate(self):
        r = requests.post(f"{API}/auth/register", json={"email": ALICE["email"], "password": "x", "name": "x"}, timeout=10)
        assert r.status_code == 400

    def test_register_and_login_new(self):
        email = f"test_{secrets.token_hex(4)}@test.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pw12345", "name": "Tester"}, timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == email
        assert d["token"]
        assert d["pairing_code"]
        # login
        r2 = requests.post(f"{API}/auth/login", json={"email": email, "password": "pw12345"}, timeout=10)
        assert r2.status_code == 200

    def test_logout(self):
        s, data = _login(ALICE)
        r = s.post(f"{API}/auth/logout", timeout=10)
        assert r.status_code == 200


# --- partner ---
class TestPartner:
    def test_get_code(self, alice_session):
        s, data = alice_session
        r = s.get(f"{API}/partner/code", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r.status_code == 200
        assert r.json().get("pairing_code")

    def test_partner_info_paired(self, alice_session):
        s, data = alice_session
        r = s.get(f"{API}/partner/info", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body.get("paired") is True
        assert body.get("partner_name")
        assert body.get("couple_id")

    def test_pair_already_paired(self, alice_session):
        s, data = alice_session
        r = s.post(f"{API}/partner/pair", json={"pairing_code": "XXXXXXXX"},
                   headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r.status_code == 400  # already paired

    def test_pair_requires_auth(self):
        r = requests.post(f"{API}/partner/pair", json={"pairing_code": "XYZ"}, timeout=10)
        assert r.status_code == 401

    def test_pair_invalid_code_for_unpaired_user(self):
        # create new user, try to pair with invalid code
        email = f"test_{secrets.token_hex(4)}@test.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pw12345", "name": "Solo"}, timeout=10)
        assert r.status_code == 200
        tok = r.json()["token"]
        r2 = requests.post(f"{API}/partner/pair", json={"pairing_code": "INVALID!"},
                           headers={"Authorization": f"Bearer {tok}"}, timeout=10)
        assert r2.status_code == 404


# --- watchlist ---
class TestWatchlist:
    created_ids = []

    def test_list_initial(self, alice_session):
        s, data = alice_session
        r = s.get(f"{API}/watchlist", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_item(self, alice_session):
        s, data = alice_session
        title = f"TEST_Movie_{secrets.token_hex(3)}"
        r = s.post(f"{API}/watchlist", json={"title": title, "platform": "Netflix", "notes": "fun"},
                   headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["title"] == title
        assert body["id"]
        TestWatchlist.created_ids.append(body["id"])

        # Verify via GET
        r2 = s.get(f"{API}/watchlist", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        titles = [it["title"] for it in r2.json()]
        assert title in titles

    def test_partner_sees_item(self, alice_session, bob_session):
        # Alice creates, Bob sees it
        sa, da = alice_session
        sb, db_ = bob_session
        title = f"TEST_Shared_{secrets.token_hex(3)}"
        r = sa.post(f"{API}/watchlist", json={"title": title, "platform": "Netflix"},
                    headers={"Authorization": f"Bearer {da['token']}"}, timeout=10)
        assert r.status_code == 200
        item_id = r.json()["id"]
        TestWatchlist.created_ids.append(item_id)
        r2 = sb.get(f"{API}/watchlist", headers={"Authorization": f"Bearer {db_['token']}"}, timeout=10)
        assert r2.status_code == 200
        assert any(it["id"] == item_id for it in r2.json())

    def test_update_item(self, alice_session):
        s, data = alice_session
        title = f"TEST_Upd_{secrets.token_hex(3)}"
        r = s.post(f"{API}/watchlist", json={"title": title},
                   headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        item_id = r.json()["id"]
        TestWatchlist.created_ids.append(item_id)
        r2 = s.put(f"{API}/watchlist/{item_id}", json={"status": "watched"},
                   headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r2.status_code == 200

    def test_delete_item(self, alice_session):
        s, data = alice_session
        title = f"TEST_Del_{secrets.token_hex(3)}"
        r = s.post(f"{API}/watchlist", json={"title": title},
                   headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        item_id = r.json()["id"]
        r2 = s.delete(f"{API}/watchlist/{item_id}",
                      headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r2.status_code == 200
        r3 = s.get(f"{API}/watchlist", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert not any(it["id"] == item_id for it in r3.json())

    @classmethod
    def teardown_class(cls):
        # Cleanup TEST_ items
        try:
            s, data = _login(ALICE)
            for iid in cls.created_ids:
                s.delete(f"{API}/watchlist/{iid}", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        except Exception:
            pass


# --- ice-config ---
class TestIceConfig:
    def test_ice_config_requires_auth(self):
        r = requests.get(f"{API}/ice-config", timeout=10)
        assert r.status_code == 401

    def test_ice_config_returns_stun(self, alice_session):
        s, data = alice_session
        r = s.get(f"{API}/ice-config", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert "iceServers" in body
        servers = body["iceServers"]
        assert isinstance(servers, list)
        assert len(servers) >= 1
        # Verify at least one STUN server
        stun_urls = [s["urls"] for s in servers if "urls" in s]
        assert any("stun:" in str(u) for u in stun_urls), f"No STUN servers found: {stun_urls}"


# --- date nights ---
class TestDateNights:
    created_ids = []

    def test_list_requires_auth(self):
        r = requests.get(f"{API}/date-nights", timeout=10)
        assert r.status_code == 401

    def test_list_initial(self, alice_session):
        s, data = alice_session
        r = s.get(f"{API}/date-nights", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_date_night(self, alice_session):
        s, data = alice_session
        title = f"TEST_DN_{secrets.token_hex(3)}"
        payload = {"title": title, "date": "2026-06-15", "time": "21:00", "movie": "Inception", "notes": "popcorn"}
        r = s.post(f"{API}/date-nights", json=payload,
                   headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["title"] == title
        assert body["date"] == "2026-06-15"
        assert body["time"] == "21:00"
        assert body["movie"] == "Inception"
        assert body["status"] == "upcoming"
        assert body["id"]
        TestDateNights.created_ids.append(body["id"])

        # GET to verify persistence
        r2 = s.get(f"{API}/date-nights", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert any(n["id"] == body["id"] and n["title"] == title for n in r2.json())

    def test_partner_sees_date_night(self, alice_session, bob_session):
        sa, da = alice_session
        sb, db_ = bob_session
        title = f"TEST_DN_Shared_{secrets.token_hex(3)}"
        r = sa.post(f"{API}/date-nights",
                    json={"title": title, "date": "2026-07-20", "time": "20:30"},
                    headers={"Authorization": f"Bearer {da['token']}"}, timeout=10)
        assert r.status_code == 200
        nid = r.json()["id"]
        TestDateNights.created_ids.append(nid)
        r2 = sb.get(f"{API}/date-nights", headers={"Authorization": f"Bearer {db_['token']}"}, timeout=10)
        assert r2.status_code == 200
        assert any(n["id"] == nid for n in r2.json())

    def test_update_status_complete(self, alice_session):
        s, data = alice_session
        r = s.post(f"{API}/date-nights", json={"title": f"TEST_DN_Upd_{secrets.token_hex(3)}", "date": "2026-08-01", "time": "20:00"},
                   headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        nid = r.json()["id"]
        TestDateNights.created_ids.append(nid)
        r2 = s.put(f"{API}/date-nights/{nid}", json={"status": "completed"},
                   headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r2.status_code == 200
        # Verify via GET
        r3 = s.get(f"{API}/date-nights", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        match = [n for n in r3.json() if n["id"] == nid]
        assert match and match[0]["status"] == "completed"

    def test_delete_date_night(self, alice_session):
        s, data = alice_session
        r = s.post(f"{API}/date-nights", json={"title": f"TEST_DN_Del_{secrets.token_hex(3)}", "date": "2026-09-10", "time": "19:30"},
                   headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        nid = r.json()["id"]
        r2 = s.delete(f"{API}/date-nights/{nid}",
                      headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r2.status_code == 200
        r3 = s.get(f"{API}/date-nights", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert not any(n["id"] == nid for n in r3.json())

    def test_create_unpaired_blocked(self):
        # Fresh unpaired user cannot create date nights
        email = f"test_{secrets.token_hex(4)}@test.com"
        r = requests.post(f"{API}/auth/register", json={"email": email, "password": "pw12345", "name": "Solo"}, timeout=10)
        assert r.status_code == 200
        tok = r.json()["token"]
        r2 = requests.post(f"{API}/date-nights", json={"title": "nope", "date": "2026-10-01", "time": "20:00"},
                           headers={"Authorization": f"Bearer {tok}"}, timeout=10)
        assert r2.status_code == 400

    @classmethod
    def teardown_class(cls):
        try:
            s, data = _login(ALICE)
            for nid in cls.created_ids:
                s.delete(f"{API}/date-nights/{nid}", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        except Exception:
            pass


# --- messages ---
class TestMessages:
    def test_get_messages(self, alice_session):
        s, data = alice_session
        r = s.get(f"{API}/messages", headers={"Authorization": f"Bearer {data['token']}"}, timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_messages_unauth(self):
        r = requests.get(f"{API}/messages", timeout=10)
        assert r.status_code == 401
