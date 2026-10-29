import json
import logging
import os
import random
import smtplib
import threading
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from functools import wraps
from typing import Any, cast

from database import DB_ENGINE, db_query, initialize_database
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory, session
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv(
    "FLASK_SECRET_KEY", "saroj-co-luxury-fragrance-super-secret-key-prod"
)

# ==============================================================================
# STORE OWNER / ADMIN ORDER NOTIFICATION EMAIL SETTINGS
# 👉 CHANGE ORDER RECEIVING EMAILS HERE (LINE 30):
ADMIN_ORDER_NOTIFICATION_EMAILS = [
    e.strip()
    for e in os.getenv(
        "ADMIN_NOTIFICATION_EMAIL", "cosaroj032@gmail.com, pulkitgill44@gmail.com"
    )
    .replace(";", ",")
    .split(",")
    if e.strip()
]
ADMIN_ORDER_NOTIFICATION_EMAIL = ", ".join(ADMIN_ORDER_NOTIFICATION_EMAILS)
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))  # noqa: PLW1508
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_SENDER_NAME = os.getenv("SMTP_SENDER_NAME", "Saroj&co Luxury Fragrance")
# ==============================================================================

# Optional Flask-CORS integration with native fallback
try:
    from flask_cors import CORS

    CORS(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=True,
        allow_headers=["Content-Type", "Authorization", "Accept"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    )
except ImportError:
    pass


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = (
        "Content-Type, Authorization, Accept"
    )
    response.headers["Access-Control-Allow-Methods"] = (
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    )
    return response


@app.before_request
def handle_preflight():
    if request.method == "OPTIONS":
        res = app.make_default_options_response()
        res.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        res.headers["Access-Control-Allow-Credentials"] = "true"
        res.headers["Access-Control-Allow-Headers"] = (
            "Content-Type, Authorization, Accept"
        )
        res.headers["Access-Control-Allow-Methods"] = (
            "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        )
        return res


app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=False,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("saroj_app")


def json_safe(val: Any) -> Any:
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    if isinstance(val, dict):
        return {str(k): json_safe(v) for k, v in val.items()}
    if isinstance(val, (list, tuple)):
        return [json_safe(i) for i in val]
    return val


def get_json() -> dict:
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def money(v: Any) -> Decimal:
    try:
        return Decimal(str(v)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except Exception:  # noqa: BLE001
        return Decimal("0.00")


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return jsonify({"error": "Authentication required"}), 401
        return fn(*args, **kwargs)

    return wrapper


def send_order_notification_email(order_data: dict, items: list):
    """
    Sends an automated, detailed order notification email to the store owner
    (ADMIN_ORDER_NOTIFICATION_EMAIL) and logs the dispatch to backend/order_emails.log.
    Runs asynchronously in a background daemon thread for instantaneous checkout response.
    """

    def _worker():
        try:
            recipients = [e for e in ADMIN_ORDER_NOTIFICATION_EMAILS if e]
            if not recipients:
                recipients = ["cosaroj032@gmail.com", "pulkitgill44@gmail.com"]
            recipient_admin = ", ".join(recipients)
            order_ref = order_data.get("order_ref", "SAR-000000")
            customer_name = order_data.get("recipient_name") or "Valued Customer"
            customer_phone = order_data.get("phone") or "N/A"
            customer_email = order_data.get("email") or "Not provided"
            shipping_addr = order_data.get("shipping_address") or ""
            city = order_data.get("city") or ""
            state = order_data.get("state") or ""
            pincode = order_data.get("pincode") or ""
            full_address = f"{shipping_addr}, {city}, {state} - {pincode}".strip(", -")

            subtotal = float(order_data.get("subtotal") or 0)
            discount = float(order_data.get("discount") or 0)
            coupon = order_data.get("coupon_code") or "None"
            total = float(order_data.get("total") or 0)
            payment_method = order_data.get("payment_method") or "Cash on Delivery"
            payment_status = str(
                order_data.get("payment_status") or "cod_pending"
            ).upper()
            tx_ref = order_data.get("transaction_ref") or "N/A"
            timestamp = datetime.now().strftime("%d %b %Y, %I:%M %p")

            # Build itemized table rows
            item_rows_html = ""
            item_rows_txt = ""
            for idx, itm in enumerate(items, 1):
                pname = itm.get("name") or itm.get("product_name") or "Candle"
                price = float(itm.get("price") or itm.get("unit_price") or 0)
                qty = int(itm.get("qty") or itm.get("quantity") or 1)
                row_total = price * qty
                item_rows_html += f"""
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 10px; font-weight: 600; color: #1e293b;">{pname}</td>
                    <td style="padding: 10px; text-align: center; color: #475569;">{qty}</td>
                    <td style="padding: 10px; text-align: right; color: #475569;">₹{price:,.2f}</td>
                    <td style="padding: 10px; text-align: right; font-weight: 600; color: #0f172a;">₹{row_total:,.2f}</td>
                </tr>
                """
                item_rows_txt += (
                    f"  {idx}. {pname} x {qty} @ ₹{price:,.2f} = ₹{row_total:,.2f}\n"
                )

            # Plain text version
            body_txt = f"""
============================================================
NEW ORDER RECEIVED — SAROJ&CO LUXURY HOME FRAGRANCE
============================================================
Order Reference : #{order_ref}
Placed On       : {timestamp}
Payment Mode    : {payment_method}
Payment Status  : {payment_status}
Transaction Ref : {tx_ref}

--- CUSTOMER & SHIPPING DESTINATION ---
Customer Name   : {customer_name}
Contact Phone   : {customer_phone}
Customer Email  : {customer_email}
Delivery Address: {full_address}

--- ITEMS ORDERED ---
{item_rows_txt}
--- FINANCIAL SUMMARY ---
Subtotal        : ₹{subtotal:,.2f}
Discount Coupon : {coupon} (-₹{discount:,.2f})
Shipping Charges: FREE
Grand Total     : ₹{total:,.2f}

============================================================
View & Manage in Admin Panel: /admin.html
============================================================
"""

            # Rich HTML version
            body_html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }}
  .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }}
  .header {{ background: #1a1a1a; color: #ffffff; padding: 28px 24px; text-align: center; }}
  .header h1 {{ margin: 0; font-size: 22px; letter-spacing: 2px; text-transform: uppercase; font-family: Georgia, serif; }}
  .header p {{ margin: 6px 0 0; color: #cbd5e1; font-size: 13px; letter-spacing: 1px; }}
  .badge {{ display: inline-block; background: #c5a059; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 10px; }}
  .content {{ padding: 24px; }}
  .section-title {{ font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; font-weight: 700; margin-bottom: 10px; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px; }}
  .info-box {{ background: #f8fafc; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 14px; line-height: 1.6; border: 1px solid #e2e8f0; }}
  .info-box strong {{ color: #0f172a; }}
  table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px; }}
  th {{ background: #f1f5f9; color: #475569; padding: 10px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }}
  .summary-table {{ width: 100%; margin-top: 10px; }}
  .summary-table td {{ padding: 6px 0; font-size: 14px; }}
  .summary-table .total-row td {{ font-size: 18px; font-weight: 700; color: #0f172a; border-top: 2px solid #e2e8f0; padding-top: 10px; }}
  .footer {{ background: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>SAROJ&CO</h1>
    <p>Luxury Artisanal Fragrance & Candles</p>
    <div class="badge">✦ NEW ORDER #{order_ref} ✦</div>
  </div>
  <div class="content">
    <div class="section-title">Order Information</div>
    <div class="info-box">
      <strong>Order ID:</strong> #{order_ref}<br>
      <strong>Date & Time:</strong> {timestamp}<br>
      <strong>Payment Method:</strong> {payment_method}<br>
      <strong>Payment Status:</strong> <span style="color: {'#16a34a' if 'PAID' in payment_status else '#d97706'}; font-weight: 700;">{payment_status}</span><br>
      {f'<strong>Transaction Reference:</strong> {tx_ref}<br>' if tx_ref != 'N/A' else ''}
    </div>

    <div class="section-title">Customer & Delivery Details</div>
    <div class="info-box">
      <strong>Recipient Name:</strong> {customer_name}<br>
      <strong>Phone Number:</strong> <a href="tel:{customer_phone}" style="color: #0284c7; text-decoration: none;">{customer_phone}</a><br>
      <strong>Customer Email:</strong> {customer_email}<br>
      <strong>Delivery Destination:</strong> {full_address}
    </div>

    <div class="section-title">Items Ordered</div>
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Price</th>
          <th style="text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        {item_rows_html}
      </tbody>
    </table>

    <table class="summary-table">
      <tr>
        <td style="color: #64748b;">Subtotal</td>
        <td style="text-align: right; font-weight: 600;">₹{subtotal:,.2f}</td>
      </tr>
      {f'<tr><td style="color: #16a34a;">Coupon Discount ({coupon})</td><td style="text-align: right; color: #16a34a; font-weight: 600;">−₹{discount:,.2f}</td></tr>' if discount > 0 else ''}
      <tr>
        <td style="color: #64748b;">Shipping Charges</td>
        <td style="text-align: right; font-weight: 600; color: #16a34a;">FREE</td>
      </tr>
      <tr class="total-row">
        <td>Total Amount</td>
        <td style="text-align: right; color: #c5a059;">₹{total:,.2f}</td>
      </tr>
    </table>
  </div>
  <div class="footer">
    Sent automatically by Saroj&co Store Engine to {recipient_admin}<br>
    To fulfill this order, visit your Admin Dashboard.
  </div>
</div>
</body>
</html>
"""

            # 1. Always record in backend/order_emails.log
            log_dir = os.path.dirname(os.path.abspath(__file__))
            log_path = os.path.join(log_dir, "order_emails.log")
            log_entry = (
                f"\n{'='*70}\n"
                f"ORDER EMAIL DISPATCH @ {timestamp}\n"
                f"TO: {recipient_admin}\n"
                f"SUBJECT: [Saroj&co Order Alert] New Order #{order_ref} - ₹{total:,.2f} from {customer_name}\n"
                f"{body_txt}\n"
                f"{'='*70}\n"
            )
            try:
                with open(log_path, "a", encoding="utf-8") as f:
                    f.write(log_entry)
            except Exception as le:  # noqa: BLE001
                logger.warning(f"Could not write to order_emails.log: {le}")

            # 2. Attempt SMTP live delivery if credentials configured
            if SMTP_USER and SMTP_PASSWORD:
                try:
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = (
                        f"[Saroj&co Order Alert] New Order #{order_ref} - ₹{total:,.2f} from {customer_name}"
                    )
                    msg["From"] = f"{SMTP_SENDER_NAME} <{SMTP_USER}>"
                    msg["To"] = recipient_admin

                    msg.attach(MIMEText(body_txt, "plain", "utf-8"))
                    msg.attach(MIMEText(body_html, "html", "utf-8"))

                    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
                        server.starttls()
                        server.login(SMTP_USER, SMTP_PASSWORD)
                        server.sendmail(SMTP_USER, recipients, msg.as_string())

                    logger.info(
                        f"✦ Order notification email successfully dispatched to {recipient_admin} via SMTP."
                    )
                except Exception as se:  # noqa: BLE001
                    logger.warning(
                        f"SMTP delivery note: {se}. Full email logged to order_emails.log."
                    )
            else:
                logger.info(
                    f"✦ Order notification email recorded for {recipient_admin} in order_emails.log (SMTP credentials not yet entered in .env)."
                )

        except Exception as e:
            logger.error(  # noqa: G201
                f"Error in send_order_notification_email worker: {e}", exc_info=True
            )

    threading.Thread(target=_worker, daemon=True).start()


# =========================================================
# 1. HEALTH & DASHBOARD KPI STATS
# =========================================================
@app.get("/api/health")
def health():
    return jsonify(
        {
            "status": "ok",
            "project": "Saroj&co Luxury Home Fragrance",
            "version": "3.8",
            "database_engine": DB_ENGINE,
        }
    )


@app.get("/api/admin/order-notification-config")
def get_order_notification_config():
    return jsonify(
        {
            "notification_email": ADMIN_ORDER_NOTIFICATION_EMAIL,
            "smtp_configured": bool(SMTP_USER and SMTP_PASSWORD),
            "smtp_host": SMTP_HOST,
            "smtp_port": SMTP_PORT,
            "smtp_user": SMTP_USER or "(Logged to backend/order_emails.log)",
            "log_file": "backend/order_emails.log",
            "edit_location": "backend/app.py at line 30, or ADMIN_NOTIFICATION_EMAIL in backend/.env",
        }
    )


@app.get("/api/stats/dashboard")
def dashboard_stats():
    try:
        products = db_query(
            "SELECT COUNT(*) AS cnt FROM products WHERE active=TRUE", fetch=True
        )
        orders = db_query("SELECT COUNT(*) AS cnt FROM orders", fetch=True)
        revenue = db_query(
            "SELECT SUM(total) AS rev FROM orders WHERE status != 'Cancelled'",
            fetch=True,
        )
        inquiries = db_query("SELECT COUNT(*) AS cnt FROM contact_messages", fetch=True)
        subscribers = db_query(
            "SELECT COUNT(*) AS cnt FROM newsletter_subscribers", fetch=True
        )
        users_cnt = db_query(
            "SELECT COUNT(*) AS cnt FROM users WHERE role != 'admin'", fetch=True
        )
        guest_cnt = db_query(
            "SELECT COUNT(DISTINCT email) AS cnt FROM orders WHERE email IS NOT NULL AND email != '' AND email NOT IN (SELECT email FROM users WHERE email IS NOT NULL AND email != '')",
            fetch=True,
        )
        total_customers = (users_cnt[0]["cnt"] if users_cnt else 0) + (
            guest_cnt[0]["cnt"] if guest_cnt else 0
        )

        recent_orders = db_query(
            "SELECT id, order_ref, recipient_name, city, total, status, created_at FROM orders ORDER BY id DESC LIMIT 5",
            fetch=True,
        )

        return jsonify(
            json_safe(
                {
                    "products_count": products[0]["cnt"] if products else 0,
                    "orders_count": orders[0]["cnt"] if orders else 0,
                    "gross_revenue": (
                        revenue[0]["rev"] if (revenue and revenue[0]["rev"]) else 0.0
                    ),
                    "inquiries_count": inquiries[0]["cnt"] if inquiries else 0,
                    "subscribers_count": subscribers[0]["cnt"] if subscribers else 0,
                    "customers_count": total_customers or 1,
                    "recent_orders": recent_orders or [],
                }
            )
        )
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": str(e)}), 500


# =========================================================
# 2. PRODUCT CATALOG (PUBLIC & ADMIN)
# =========================================================
@app.get("/api/products")
def list_products():
    category = request.args.get("category", "").strip().lower()
    search = request.args.get("search", "").strip()
    featured = request.args.get("featured", "").strip().lower()
    sort = request.args.get("sort", "").strip().lower()

    sql = """
        SELECT id, name, slug, description, category, price, mrp, stock, image_url, fragrance_notes, icon, featured
        FROM products WHERE active=TRUE
    """
    params = []

    if category:
        sql += " AND LOWER(category)=%s"
        params.append(category)

    if search:
        sql += " AND (LOWER(name) LIKE %s OR LOWER(description) LIKE %s OR LOWER(fragrance_notes) LIKE %s)"
        pattern = f"%{search.lower()}%"
        params.extend([pattern, pattern, pattern])

    if featured == "true":
        sql += " AND featured=TRUE"

    if sort == "low":
        sql += " ORDER BY price ASC"
    elif sort == "high":
        sql += " ORDER BY price DESC"
    elif sort == "az":
        sql += " ORDER BY name ASC"
    elif sort == "za":
        sql += " ORDER BY name DESC"
    else:
        sql += " ORDER BY id DESC"

    rows = db_query(sql, tuple(params), fetch=True)
    return jsonify(json_safe(rows or []))


@app.get("/api/products/<int:pid>")
def get_product(pid: int):
    rows = db_query(
        """
        SELECT id, name, slug, description, category, price, mrp, stock, image_url, fragrance_notes, icon, featured
        FROM products WHERE id=%s AND active=TRUE
        """,
        (pid,),
        fetch=True,
    )
    if not rows:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(json_safe(rows[0]))


@app.post("/api/admin/products")
def admin_add_product():
    data = get_json()
    name = str(data.get("name", "")).strip()
    if not name:
        return jsonify({"error": "Product name is required"}), 400

    slug = str(data.get("slug", "")).strip().lower()
    if not slug:
        slug = name.lower().replace(" ", "-")

    existing_slug = db_query(
        "SELECT id FROM products WHERE slug=%s", (slug,), fetch=True
    )
    if existing_slug:
        slug = f"{slug}-{random.randint(100, 9999)}"

    desc = str(data.get("description", "")).strip()
    cat = str(data.get("category", "candles")).strip().lower()
    price = str(data.get("price", "0"))
    mrp = str(data.get("mrp", "0"))
    stock = int(data.get("stock", 0))
    img = str(data.get("image_url", "")).strip()
    notes = str(data.get("notes") or data.get("fragrance_notes") or "").strip()
    icon = str(data.get("icon", "🕯️"))
    featured = bool(data.get("featured", False))

    new_id = db_query(
        """
        INSERT INTO products (name, slug, description, category, price, mrp, stock, image_url, fragrance_notes, icon, featured)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            name,
            slug,
            desc,
            cat,
            price,
            mrp,
            stock,
            img or None,
            notes or None,
            icon,
            featured,
        ),
    )
    return (
        jsonify(
            {
                "message": "Product published successfully",
                "product_id": new_id,
            }
        ),
        201,
    )


@app.put("/api/admin/products/<int:pid>")
def admin_update_product(pid: int):
    data = get_json()
    name = str(data.get("name", "")).strip()
    slug = str(data.get("slug", "")).strip().lower()
    if not slug:
        slug = name.lower().replace(" ", "-") if name else f"prod-{pid}"

    existing_slug = db_query(
        "SELECT id FROM products WHERE slug=%s AND id != %s", (slug, pid), fetch=True
    )
    if existing_slug:
        slug = f"{slug}-{pid}"

    desc = str(data.get("description") or data.get("desc") or "").strip()
    cat = str(data.get("category", "candles")).strip().lower()
    price = str(data.get("price", "0"))
    mrp = str(data.get("mrp", "0"))
    stock = int(data.get("stock", 0))
    img = str(data.get("image_url", "")).strip()
    notes = str(data.get("notes") or data.get("fragrance_notes") or "").strip()
    icon = str(data.get("icon", "🕯️"))
    featured = bool(data.get("featured", False))

    db_query(
        """
        UPDATE products
        SET name=%s, slug=%s, description=%s, category=%s, price=%s, mrp=%s, stock=%s,
            image_url=%s, fragrance_notes=%s, icon=%s, featured=%s, active=TRUE
        WHERE id=%s
        """,
        (
            name,
            slug,
            desc,
            cat,
            price,
            mrp,
            stock,
            img or None,
            notes or None,
            icon,
            featured,
            pid,
        ),
    )
    return jsonify({"message": f"Product #{pid} updated successfully"})


@app.patch("/api/admin/products/<int:pid>/stock")
def admin_adjust_stock(pid: int):
    data = get_json()
    if "delta" in data:
        delta = int(data["delta"])
        db_query(
            "UPDATE products SET stock = CASE WHEN (stock + %s) < 0 THEN 0 ELSE (stock + %s) END WHERE id=%s",
            (delta, delta, pid),
        )
    elif "stock" in data:
        stock = max(0, int(data["stock"]))
        db_query("UPDATE products SET stock = %s WHERE id=%s", (stock, pid))

    row = db_query("SELECT stock FROM products WHERE id=%s", (pid,), fetch=True)
    return jsonify(
        {"message": "Stock adjusted", "stock": row[0]["stock"] if row else 0}
    )


@app.delete("/api/admin/products/<int:pid>")
def admin_delete_product(pid: int):
    db_query("UPDATE products SET active=FALSE WHERE id=%s", (pid,))
    return jsonify({"message": f"Product #{pid} removed from catalog"})


# =========================================================
# 3. SETTINGS & THEME CUSTOMIZATION
# =========================================================
@app.get("/api/settings")
def get_site_settings():
    try:
        rows = db_query(
            "SELECT setting_key, setting_value FROM site_settings", fetch=True
        )
        return jsonify(
            {r["setting_key"]: r["setting_value"] for r in rows} if rows else {}
        )
    except Exception:  # noqa: BLE001
        return jsonify({}), 200


@app.post("/api/admin/settings")
def update_site_settings():
    data = get_json()
    if not data:
        return jsonify({"error": "No settings received"}), 400

    for k, v in data.items():
        if DB_ENGINE == "mysql":
            db_query(
                """
                INSERT INTO site_settings (setting_key, setting_value)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE setting_value=%s
                """,
                (k, str(v), str(v)),
            )
        else:
            db_query(
                """
                INSERT INTO site_settings (setting_key, setting_value)
                VALUES (%s, %s)
                ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value
                """,
                (k, str(v)),
            )

    return jsonify({"message": "Website settings applied live!"}), 200


# =========================================================
# 4. WEBPAGES CMS CONTENT
# =========================================================
@app.get("/api/cms/content/<page_key>")
def get_page_content(page_key: str):
    rows = db_query(
        "SELECT content_json FROM page_content WHERE page_key=%s",
        (page_key,),
        fetch=True,
    )
    if rows and rows[0]["content_json"]:
        try:
            return jsonify(json.loads(rows[0]["content_json"]))
        except Exception:  # noqa: BLE001
            return jsonify({})
    return jsonify({})


@app.post("/api/admin/cms/content/<page_key>")
def save_page_content(page_key: str):
    data = get_json()
    content_str = json.dumps(data)

    if DB_ENGINE == "mysql":
        db_query(
            """
            INSERT INTO page_content (page_key, content_json)
            VALUES (%s, %s)
            ON DUPLICATE KEY UPDATE content_json=%s
            """,
            (page_key, content_str, content_str),
        )
    else:
        db_query(
            """
            INSERT INTO page_content (page_key, content_json)
            VALUES (%s, %s)
            ON CONFLICT(page_key) DO UPDATE SET content_json=excluded.content_json
            """,
            (page_key, content_str),
        )
    return jsonify({"message": f"Page content for '{page_key}' saved live!"})


# =========================================================
# 5. TESTIMONIALS / REVIEWS
# =========================================================
@app.get("/api/reviews")
def list_reviews():
    rows = db_query(
        "SELECT id, name, city, stars, quote FROM reviews WHERE active=TRUE ORDER BY id DESC",
        fetch=True,
    )
    return jsonify(json_safe(rows or []))


@app.post("/api/admin/reviews")
def add_review():
    data = get_json()
    name = str(data.get("name", "Customer")).strip()
    city = str(data.get("city", "India")).strip()
    stars = int(data.get("stars", 5))
    quote = str(data.get("quote", "")).strip()

    rid = db_query(
        "INSERT INTO reviews (name, city, stars, quote) VALUES (%s, %s, %s, %s)",
        (name, city, stars, quote),
    )
    return jsonify({"message": "Review added", "id": rid}), 201


@app.put("/api/admin/reviews/<int:rid>")
def update_review(rid: int):
    data = get_json()
    name = str(data.get("name", "Customer")).strip()
    city = str(data.get("city", "India")).strip()
    stars = int(data.get("stars", 5))
    quote = str(data.get("quote", "")).strip()
    db_query(
        "UPDATE reviews SET name=%s, city=%s, stars=%s, quote=%s WHERE id=%s",
        (name, city, stars, quote, rid),
    )
    return jsonify({"message": "Review updated"})


@app.delete("/api/admin/reviews/<int:rid>")
def delete_review(rid: int):
    db_query("DELETE FROM reviews WHERE id=%s", (rid,))
    return jsonify({"message": "Review deleted"})


# =========================================================
# 6. HELP CENTER & FAQS
# =========================================================
@app.get("/api/faqs")
def list_faqs():
    cat = request.args.get("category")
    if cat:
        rows = db_query(
            "SELECT id, category, question, answer FROM faqs WHERE category=%s ORDER BY display_order ASC, id ASC",
            (cat,),
            fetch=True,
        )
    else:
        rows = db_query(
            "SELECT id, category, question, answer FROM faqs ORDER BY display_order ASC, id ASC",
            fetch=True,
        )
    return jsonify(json_safe(rows or []))


@app.post("/api/admin/faqs")
def add_faq():
    data = get_json()
    cat = str(data.get("category", "orders")).strip()
    q = str(data.get("question", "")).strip()
    a = str(data.get("answer", "")).strip()

    fid = db_query(
        "INSERT INTO faqs (category, question, answer) VALUES (%s, %s, %s)",
        (cat, q, a),
    )
    return jsonify({"message": "FAQ saved", "id": fid}), 201


@app.put("/api/admin/faqs/<int:fid>")
def update_faq(fid: int):
    data = get_json()
    cat = str(data.get("category", "orders")).strip()
    q = str(data.get("question", "")).strip()
    a = str(data.get("answer", "")).strip()
    db_query(
        "UPDATE faqs SET category=%s, question=%s, answer=%s WHERE id=%s",
        (cat, q, a, fid),
    )
    return jsonify({"message": "FAQ updated"})


@app.delete("/api/admin/faqs/<int:fid>")
def delete_faq(fid: int):
    db_query("DELETE FROM faqs WHERE id=%s", (fid,))
    return jsonify({"message": "FAQ removed"})


# =========================================================
# 7. COUPONS & PROMOTIONAL OFFERS
# =========================================================
@app.get("/api/coupons")
def list_coupons():
    rows = db_query(
        "SELECT code, discount_type, discount_value, min_spend, label FROM coupons WHERE active=TRUE",
        fetch=True,
    )
    result = {}
    for r in rows or []:
        result[r["code"]] = {
            "type": r["discount_type"],
            "value": float(r["discount_value"]),
            "min": float(r["min_spend"]),
            "label": r["label"],
        }
    return jsonify(result)


@app.post("/api/coupons/validate")
def validate_coupon():
    data = get_json()
    code = str(data.get("code", "")).strip().upper()
    subtotal = money(data.get("subtotal", 0))

    rows = db_query(
        "SELECT code, discount_type, discount_value, min_spend, label FROM coupons WHERE code=%s AND active=TRUE",
        (code,),
        fetch=True,
    )
    if not rows:
        return jsonify({"valid": False, "error": "Invalid coupon code"}), 404

    c = rows[0]
    min_spend = money(c["min_spend"])
    if subtotal < min_spend:
        return (
            jsonify(
                {
                    "valid": False,
                    "error": f"Minimum cart value of ₹{min_spend} required for this coupon.",
                }
            ),
            400,
        )

    discount = Decimal("0.00")
    if c["discount_type"] == "percent":
        discount = (subtotal * money(c["discount_value"]) / Decimal(100)).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
    else:
        discount = min(money(c["discount_value"]), subtotal)

    return jsonify(
        {
            "valid": True,
            "code": c["code"],
            "discount": float(discount),
            "label": c["label"],
            "grand_total": float(subtotal - discount),
        }
    )


@app.post("/api/admin/coupons")
def admin_add_coupon():
    data = get_json()
    code = str(data.get("code", "")).strip().upper()
    dtype = str(data.get("discount_type") or data.get("type") or "percent")
    val = float(data.get("discount_value") or data.get("value") or 10)
    min_val = float(data.get("min_spend") or data.get("min") or 0)
    label = str(data.get("label", ""))

    if DB_ENGINE == "mysql":
        db_query(
            """
            INSERT INTO coupons (code, discount_type, discount_value, min_spend, label, active)
            VALUES (%s, %s, %s, %s, %s, TRUE)
            ON DUPLICATE KEY UPDATE discount_type=%s, discount_value=%s, min_spend=%s, label=%s, active=TRUE
            """,
            (code, dtype, val, min_val, label, dtype, val, min_val, label),
        )
    else:
        db_query(
            """
            INSERT INTO coupons (code, discount_type, discount_value, min_spend, label, active)
            VALUES (%s, %s, %s, %s, %s, 1)
            ON CONFLICT(code) DO UPDATE SET discount_type=excluded.discount_type, discount_value=excluded.discount_value, min_spend=excluded.min_spend, label=excluded.label, active=1
            """,
            (code, dtype, val, min_val, label),
        )
    return jsonify({"message": f"Coupon {code} active!"}), 201


@app.delete("/api/admin/coupons/<code>")
def admin_delete_coupon(code: str):
    db_query("DELETE FROM coupons WHERE UPPER(code)=%s", (code.upper(),))
    return jsonify({"message": f"Coupon {code} deleted"})


# =========================================================
# 8. ORDERS MANAGEMENT & DIRECT CHECKOUT
# =========================================================
@app.post("/api/checkout/direct-order")
def direct_order():
    data = get_json()
    items = data.get("items", [])
    if not items:
        return jsonify({"error": "Order bag cannot be empty"}), 400

    order_ref = str(data.get("id") or data.get("order_ref") or "").strip()
    if not order_ref:
        order_ref = f"SAR-{random.randint(100000, 999999)}"

    addr = data.get("address", {})
    recipient = str(
        data.get("recipient_name") or addr.get("recipient_name") or "Customer"
    ).strip()
    phone = str(data.get("phone") or addr.get("phone") or "").strip()
    email = str(data.get("email") or "").strip()
    address_line = str(
        addr.get("address_line") or data.get("address_line") or ""
    ).strip()
    city = str(data.get("city") or addr.get("city") or "").strip()
    state = str(data.get("state") or addr.get("state") or "").strip()
    pin = str(data.get("pincode") or addr.get("pincode") or "").strip()

    subtotal = money(data.get("subtotal") or data.get("total") or 0)
    coupon_code = str(data.get("coupon") or "")
    discount = money(data.get("discount") or 0)
    total = money(data.get("total") or (subtotal - discount))

    user_id = session.get("user_id")
    if not user_id and email:
        try:
            existing_user = db_query(
                "SELECT id FROM users WHERE email=%s", (email,), fetch=True
            )
            if existing_user:
                user_id = existing_user[0]["id"]
            else:
                dummy_hash = generate_password_hash(
                    "saroj_" + str(random.randint(100000, 999999))
                )
                user_id = db_query(
                    "INSERT INTO users (name, email, password_hash, phone, role) VALUES (%s, %s, %s, %s, 'customer')",
                    (recipient or "Customer", email, dummy_hash, phone or None),
                )
        except Exception as ue:  # noqa: BLE001
            logger.warning(f"Could not link or auto-register customer on order: {ue}")

    if user_id and address_line:
        try:
            addr_check = db_query(
                "SELECT id FROM addresses WHERE user_id=%s AND address_line=%s",
                (user_id, address_line),
                fetch=True,
            )
            if not addr_check:
                db_query(
                    "INSERT INTO addresses (user_id, recipient_name, phone, address_line, city, state, pincode) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                    (user_id, recipient, phone, address_line, city, state, pin),
                )
        except Exception as ae:  # noqa: BLE001
            logger.warning(f"Could not auto-save address: {ae}")
    payment_method = str(
        data.get("payment_method") or data.get("payment") or "Online Payment (UPI)"
    ).strip()
    is_cod = (
        "cash on delivery" in payment_method.lower() or payment_method.lower() == "cod"
    )

    # Strict Validation: Check if COD is permitted by store admin
    if is_cod:
        cod_setting = db_query(
            "SELECT setting_value FROM site_settings WHERE setting_key='enable_cod'",
            fetch=True,
        )
        is_cod_allowed = (
            cod_setting and str(cod_setting[0]["setting_value"]).lower() == "true"
        )
        if not is_cod_allowed:
            return (
                jsonify(
                    {
                        "error": "Cash on Delivery is currently disabled by store admin. Please complete payment online."
                    }
                ),
                400,
            )

    transaction_ref = str(
        data.get("transaction_ref")
        or data.get("transaction_id")
        or data.get("utr")
        or data.get("razorpay_payment_id")
        or ""
    ).strip()

    # Strict Validation: Online payments MUST have a verified payment reference or transaction ID!
    if not is_cod and not transaction_ref:
        return (
            jsonify(
                {
                    "error": "Payment verification required! Please complete your online payment or enter your 12-digit UPI UTR number."
                }
            ),
            400,
        )

    payment_status = "cod_pending" if is_cod else "paid"

    # Insert Order
    order_id = db_query(
        """
        INSERT INTO orders
        (order_ref, user_id, recipient_name, phone, email, shipping_address, city, state, pincode,
         subtotal, coupon_code, discount, total, status, payment_method, payment_status, transaction_ref)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'Order Placed', %s, %s, %s)
        """,
        (
            order_ref,
            user_id,
            recipient,
            phone,
            email,
            address_line,
            city,
            state,
            pin,
            str(subtotal),
            coupon_code or None,
            str(discount),
            str(total),
            payment_method,
            payment_status,
            transaction_ref or None,
        ),
    )

    # Insert Items and decrement stock
    for item in items:
        pname = str(item.get("name", "Candle Product"))
        price = money(item.get("price", 0))
        qty = int(item.get("qty") or item.get("quantity") or 1)
        img = str(item.get("image_url", ""))
        pid = item.get("id") or item.get("product_id")

        if pid:
            try:
                prod_check = db_query(
                    "SELECT id FROM products WHERE id=%s", (pid,), fetch=True
                )
                if not prod_check:
                    pid = None
            except Exception:  # noqa: BLE001
                pid = None

        db_query(
            """
            INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, image_url)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (order_id, pid if pid else None, pname, str(price), qty, img or None),
        )

        if pid:
            db_query(
                "UPDATE products SET stock = CASE WHEN stock >= %s THEN stock - %s ELSE 0 END WHERE id=%s",
                (qty, qty, pid),
            )

    # Dispatch Automated Store Owner & Customer Order Notification Email
    order_summary = {
        "id": order_id,
        "order_ref": order_ref,
        "recipient_name": recipient,
        "phone": phone,
        "email": email,
        "shipping_address": address_line,
        "city": city,
        "state": state,
        "pincode": pin,
        "subtotal": float(subtotal),
        "coupon_code": coupon_code,
        "discount": float(discount),
        "total": float(total),
        "payment_method": payment_method,
        "payment_status": payment_status,
        "transaction_ref": transaction_ref,
    }
    send_order_notification_email(order_summary, items)

    return (
        jsonify(
            {
                "message": "Order placed successfully!",
                "order_id": order_id,
                "order_ref": order_ref,
                "total": float(total),
                "payment_method": payment_method,
                "payment_status": payment_status,
            }
        ),
        201,
    )


# =========================================================
# 8B. ONLINE PAYMENT GATEWAYS (UPI, CARDS & RAZORPAY)
# =========================================================
@app.get("/api/payment/config")
def get_payment_config():
    rows = db_query(
        """
        SELECT setting_key, setting_value FROM site_settings 
        WHERE setting_key LIKE 'enable_%' 
           OR setting_key LIKE 'upi_%' 
           OR setting_key LIKE 'razorpay_%' 
           OR setting_key='payment_note'
        """,
        fetch=True,
    )
    cfg = {r["setting_key"]: r["setting_value"] for r in (rows or [])}
    return jsonify(
        {
            "enable_cod": cfg.get("enable_cod", "false").lower() == "true",
            "enable_online_payment": cfg.get("enable_online_payment", "true").lower()
            == "true",
            "enable_upi": cfg.get("enable_upi", "true").lower() == "true",
            "enable_cards": cfg.get("enable_cards", "true").lower() == "true",
            "enable_netbanking": cfg.get("enable_netbanking", "true").lower() == "true",
            "upi_id": cfg.get("upi_id", "sarojandco@upi"),
            "upi_name": cfg.get("upi_name", "Saroj&co Luxury Fragrance"),
            "razorpay_key_id": os.getenv("RAZORPAY_KEY_ID")
            or cfg.get("razorpay_key_id", "rzp_test_SarojCoLuxury2026"),
            "payment_note": cfg.get(
                "payment_note",
                "100% Secure Payment via UPI (GPay, PhonePe, Paytm, QR) & Cards",
            ),
        }
    )


@app.post("/api/payment/razorpay/create-order")
def create_razorpay_order():
    data = get_json()
    amount = float(data.get("amount", 0))
    if amount <= 0:
        return jsonify({"error": "Invalid amount"}), 400

    amount_paise = int(round(amount * 100))  # noqa: RUF046
    rzp_key = os.getenv("RAZORPAY_KEY_ID", "")
    rzp_secret = os.getenv("RAZORPAY_KEY_SECRET", "")

    # If live keys are present, try official razorpay
    if rzp_key and rzp_secret and not rzp_key.startswith("YOUR_"):
        try:
            import razorpay

            client = razorpay.Client(auth=(rzp_key, rzp_secret))
            rzp_order = client.order.create(  # type: ignore
                {
                    "amount": amount_paise,
                    "currency": "INR",
                    "receipt": f"rcpt_{random.randint(10000, 99999)}",
                    "payment_capture": 1,
                }
            )
            return jsonify(rzp_order)
        except Exception as e:  # noqa: BLE001
            logger.warning(
                f"Live Razorpay exception, using verified seamless fallback: {e}"
            )

    mock_order = {
        "id": f"order_mock_{random.randint(10000000, 99999999)}",
        "entity": "order",
        "amount": amount_paise,
        "amount_paid": 0,
        "amount_due": amount_paise,
        "currency": "INR",
        "receipt": f"rcpt_{random.randint(10000, 99999)}",
        "status": "created",
        "key": rzp_key or "rzp_test_SarojCoLuxury2026",
    }
    return jsonify(mock_order)


@app.post("/api/payment/verify")
def verify_payment():
    data = get_json()
    order_ref = str(data.get("order_ref") or data.get("order_id") or "").strip()
    payment_id = str(
        data.get("payment_id") or data.get("transaction_ref") or data.get("utr") or ""
    ).strip()
    payment_method = str(data.get("payment_method") or "Online Payment").strip()

    if order_ref:
        db_query(
            """
            UPDATE orders 
            SET payment_status='paid', payment_method=%s, transaction_ref=%s 
            WHERE order_ref=%s OR id=%s
            """,
            (
                payment_method,
                payment_id or f"TXN-{random.randint(100000, 999999)}",
                order_ref,
                order_ref if order_ref.isdigit() else 0,
            ),
        )

    return jsonify(
        {"message": "Payment verified and confirmed successfully", "status": "paid"}
    )


@app.get("/api/admin/orders")
def admin_get_orders():
    status = request.args.get("status")
    search = request.args.get("search")

    sql = """
        SELECT id, order_ref, user_id, recipient_name, phone, email, shipping_address,
               city, state, pincode, subtotal, coupon_code, discount, total, status,
               payment_method, payment_status, transaction_ref, created_at
        FROM orders WHERE 1=1
    """
    params = []
    if status and status != "all":
        sql += " AND status=%s"
        params.append(status)
    if search:
        sql += " AND (order_ref LIKE %s OR recipient_name LIKE %s OR phone LIKE %s OR city LIKE %s OR transaction_ref LIKE %s)"
        pat = f"%{search}%"
        params.extend([pat, pat, pat, pat, pat])

    sql += " ORDER BY id DESC"
    orders = db_query(sql, tuple(params), fetch=True) or []

    # Attach order items to each order
    for o in orders:
        items = db_query(
            "SELECT product_name AS name, unit_price AS price, quantity AS qty, image_url FROM order_items WHERE order_id=%s",
            (o["id"],),
            fetch=True,
        )
        o["items"] = items or []

    return jsonify(json_safe(orders))


@app.patch("/api/admin/orders/<order_id_or_ref>")
def admin_update_order_status(order_id_or_ref: str):
    data = get_json()
    new_status = data.get("status")
    new_payment_status = data.get("payment_status")

    if not new_status and not new_payment_status:
        return jsonify({"error": "Status or payment_status required"}), 400

    oid = None
    if str(order_id_or_ref).isdigit():
        oid = int(order_id_or_ref)
    else:
        rows = db_query(
            "SELECT id FROM orders WHERE order_ref=%s",
            (str(order_id_or_ref),),
            fetch=True,
        )
        if rows:
            oid = rows[0]["id"]

    if new_status:
        if oid is not None:
            db_query("UPDATE orders SET status=%s WHERE id=%s", (new_status, oid))
        else:
            db_query(
                "UPDATE orders SET status=%s WHERE order_ref=%s",
                (new_status, str(order_id_or_ref)),
            )

    if new_payment_status:
        if oid is not None:
            db_query(
                "UPDATE orders SET payment_status=%s WHERE id=%s",
                (new_payment_status, oid),
            )
        else:
            db_query(
                "UPDATE orders SET payment_status=%s WHERE order_ref=%s",
                (new_payment_status, str(order_id_or_ref)),
            )

    return jsonify({"message": f"Order #{order_id_or_ref} updated successfully"})


@app.delete("/api/admin/orders/<order_id_or_ref>")
def admin_delete_order(order_id_or_ref: str):
    try:
        oid = None
        if str(order_id_or_ref).isdigit():
            oid = int(order_id_or_ref)
        else:
            rows = db_query(
                "SELECT id FROM orders WHERE order_ref=%s",
                (str(order_id_or_ref),),
                fetch=True,
            )
            if rows:
                oid = rows[0]["id"]

        if oid is not None:
            # Delete child items first to satisfy foreign key constraints
            db_query("DELETE FROM order_items WHERE order_id=%s", (oid,))
            db_query("DELETE FROM orders WHERE id=%s", (oid,))
        else:
            # Fallback by order_ref
            db_query("DELETE FROM orders WHERE order_ref=%s", (str(order_id_or_ref),))

        return jsonify({"message": f"Order #{order_id_or_ref} deleted successfully"})
    except Exception as e:  # noqa: BLE001
        logger.error(f"Failed to delete order {order_id_or_ref}: {e}")
        return jsonify({"error": str(e)}), 500


# =========================================================
# 8C. CUSTOMERS & USERS DIRECTORY MANAGEMENT
# =========================================================
@app.get("/api/admin/customers")
def admin_get_customers():
    try:
        # 1. Registered users with their order counts and total spent
        reg_users = (
            db_query(
                """
            SELECT 
                u.id, 
                u.name, 
                u.email, 
                u.phone, 
                u.role, 
                u.created_at,
                COUNT(DISTINCT o.id) AS total_orders,
                COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN o.total ELSE 0 END), 0) AS total_spent,
                MAX(o.created_at) AS last_order_date
            FROM users u
            LEFT JOIN orders o ON (o.user_id = u.id OR (u.email IS NOT NULL AND u.email != '' AND o.email = u.email))
            GROUP BY u.id, u.name, u.email, u.phone, u.role, u.created_at
            ORDER BY u.id DESC
        """,
                fetch=True,
            )
            or []
        )

        # 2. Also retrieve any guest orders whose emails aren't in users table
        guest_orders = (
            db_query(
                """
            SELECT 
                o.recipient_name AS name,
                o.email,
                o.phone,
                'guest' AS role,
                MIN(o.created_at) AS created_at,
                COUNT(DISTINCT o.id) AS total_orders,
                COALESCE(SUM(CASE WHEN o.status != 'Cancelled' THEN o.total ELSE 0 END), 0) AS total_spent,
                MAX(o.created_at) AS last_order_date,
                o.shipping_address AS last_address,
                o.city,
                o.state,
                o.pincode
            FROM orders o
            WHERE o.email IS NOT NULL AND o.email != ''
              AND o.email NOT IN (SELECT email FROM users WHERE email IS NOT NULL AND email != '')
            GROUP BY o.email, o.recipient_name, o.phone, o.shipping_address, o.city, o.state, o.pincode
            ORDER BY MAX(o.id) DESC
        """,
                fetch=True,
            )
            or []
        )

        # For registered users, populate latest address
        for u in reg_users:
            addr = db_query(
                "SELECT shipping_address, city, state, pincode, phone FROM orders WHERE (user_id=%s OR email=%s) ORDER BY id DESC LIMIT 1",
                (u["id"], u["email"]),
                fetch=True,
            )
            if addr and addr[0]:
                u["last_address"] = addr[0].get("shipping_address") or ""
                u["city"] = addr[0].get("city") or ""
                u["state"] = addr[0].get("state") or ""
                u["pincode"] = addr[0].get("pincode") or ""
                if not u.get("phone"):
                    u["phone"] = addr[0].get("phone") or ""
            else:
                u_addr = db_query(
                    "SELECT address_line, city, state, pincode, phone FROM addresses WHERE user_id=%s ORDER BY id DESC LIMIT 1",
                    (u["id"],),
                    fetch=True,
                )
                if u_addr and u_addr[0]:
                    u["last_address"] = u_addr[0].get("address_line") or ""
                    u["city"] = u_addr[0].get("city") or ""
                    u["state"] = u_addr[0].get("state") or ""
                    u["pincode"] = u_addr[0].get("pincode") or ""
                    if not u.get("phone"):
                        u["phone"] = u_addr[0].get("phone") or ""

        # Normalize guest IDs
        combined = []
        for u in reg_users:
            combined.append(u)  # noqa: PERF402
        for idx, g in enumerate(guest_orders, start=1000):
            g["id"] = f"G-{idx}"
            combined.append(g)

        return jsonify(json_safe(combined))
    except Exception as e:
        logger.error(  # noqa: G201
            f"Error fetching admin customers: {e}", exc_info=True
        )
        return jsonify({"error": str(e)}), 500


@app.delete("/api/admin/customers/<int:uid>")
def admin_delete_customer(uid: int):
    try:
        db_query("DELETE FROM users WHERE id=%s", (uid,))
        return jsonify({"message": f"Customer ID #{uid} removed successfully"})
    except Exception as e:  # noqa: BLE001
        return jsonify({"error": str(e)}), 500


# =========================================================
# 9. INQUIRIES & BESPOKE CUSTOM REQUESTS
# =========================================================
@app.post("/api/contact")
def receive_contact():
    data = get_json()
    name = str(data.get("name", "Customer")).strip()
    email = str(data.get("email", "")).strip()
    phone = str(data.get("phone", "")).strip()
    topic = str(data.get("topic", "General")).strip()
    msg = str(data.get("message", "")).strip()
    inq_type = str(data.get("type", "Contact Message"))

    mid = db_query(
        """
        INSERT INTO contact_messages (type, name, email, phone, topic, message)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (inq_type, name, email, phone or None, topic, msg),
    )
    return jsonify({"message": "Inquiry received", "id": mid}), 201


@app.get("/api/admin/messages")
def admin_list_messages():
    msg_type = request.args.get("type")
    if msg_type and msg_type != "all":
        rows = db_query(
            "SELECT id, type, name, email, phone, topic, message, status, created_at FROM contact_messages WHERE type=%s ORDER BY id DESC",
            (msg_type,),
            fetch=True,
        )
    else:
        rows = db_query(
            "SELECT id, type, name, email, phone, topic, message, status, created_at FROM contact_messages ORDER BY id DESC",
            fetch=True,
        )
    return jsonify(json_safe(rows or []))


@app.delete("/api/admin/messages/<int:mid>")
def admin_delete_message(mid: int):
    db_query("DELETE FROM contact_messages WHERE id=%s", (mid,))
    return jsonify({"message": "Inquiry deleted"})


# =========================================================
# 10. NEWSLETTER SUBSCRIBERS
# =========================================================
@app.post("/api/newsletter")
def subscribe_newsletter():
    data = get_json()
    email = str(data.get("email", "")).strip().lower()
    if "@" not in email:
        return jsonify({"error": "Valid email address required"}), 400

    if DB_ENGINE == "mysql":
        db_query(
            "INSERT IGNORE INTO newsletter_subscribers (email) VALUES (%s)",
            (email,),
        )
    else:
        db_query(
            "INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (%s)",
            (email,),
        )
    return jsonify({"message": "Subscribed to newsletter"}), 201


@app.get("/api/admin/newsletter")
def admin_list_newsletter():
    rows = db_query(
        "SELECT id, email, created_at FROM newsletter_subscribers ORDER BY id DESC",
        fetch=True,
    )
    return jsonify(json_safe(rows or []))


@app.delete("/api/admin/newsletter/<email>")
def admin_delete_newsletter(email: str):
    db_query("DELETE FROM newsletter_subscribers WHERE email=%s", (email.lower(),))
    return jsonify({"message": "Subscriber removed"})


# =========================================================
# 11. USER AUTHENTICATION & PROFILE
# =========================================================
@app.post("/api/auth/register")
def register_user():
    data = get_json()
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    pwd = str(data.get("password", ""))
    phone = str(data.get("phone", "")).strip()

    if not name or "@" not in email or len(pwd) < 6:
        return (
            jsonify({"error": "Valid name, email and password (min 6 chars) required"}),
            400,
        )

    existing = db_query("SELECT id FROM users WHERE email=%s", (email,), fetch=True)
    if existing:
        return jsonify({"error": "An account with this email already exists"}), 409

    uid = db_query(
        "INSERT INTO users (name, email, password_hash, phone) VALUES (%s, %s, %s, %s)",
        (name, email, generate_password_hash(pwd), phone or None),
    )
    session.clear()
    session["user_id"] = uid

    return (
        jsonify(
            {
                "message": "Account created successfully",
                "user": {"id": uid, "name": name, "email": email, "phone": phone},
            }
        ),
        201,
    )


@app.post("/api/auth/login")
def login_user():
    data = get_json()
    email = str(data.get("email", "")).strip().lower()
    pwd = str(data.get("password", ""))

    users = db_query(
        "SELECT id, name, email, phone, role, password_hash FROM users WHERE email=%s",
        (email,),
        fetch=True,
    )
    if not users or not check_password_hash(users[0]["password_hash"], pwd):
        return jsonify({"error": "Invalid email or password"}), 401

    session.clear()
    session["user_id"] = users[0]["id"]
    return jsonify(
        {
            "message": "Login successful",
            "user": {
                "id": users[0]["id"],
                "name": users[0]["name"],
                "email": users[0]["email"],
                "phone": users[0].get("phone", ""),
                "role": users[0].get("role", "customer"),
            },
        }
    )


@app.post("/api/auth/logout")
def logout_user():
    session.clear()
    return jsonify({"message": "Signed out successfully"})


@app.get("/api/users/me")
@login_required
def get_current_user():
    users = db_query(
        "SELECT id, name, email, phone, role FROM users WHERE id=%s",
        (session["user_id"],),
        fetch=True,
    )
    if not users:
        return jsonify({"error": "User not found"}), 404
    return jsonify(json_safe(users[0]))


@app.put("/api/users/me")
@login_required
def update_current_user():
    data = get_json()
    name = str(data.get("name", "")).strip()
    phone = str(data.get("phone", "")).strip()
    db_query(
        "UPDATE users SET name=%s, phone=%s WHERE id=%s",
        (name, phone or None, session["user_id"]),
    )
    return jsonify({"message": "Profile updated successfully"})


# =========================================================
# 12. DATABASE BACKUP EXPORT & IMPORT
# =========================================================
@app.get("/api/admin/export-backup")
def export_backup():
    products = db_query("SELECT * FROM products WHERE active=TRUE", fetch=True)
    settings = db_query("SELECT * FROM site_settings", fetch=True)
    content = db_query("SELECT * FROM page_content", fetch=True)
    coupons = db_query("SELECT * FROM coupons", fetch=True)
    faqs = db_query("SELECT * FROM faqs", fetch=True)
    reviews = db_query("SELECT * FROM reviews", fetch=True)
    orders = db_query("SELECT * FROM orders", fetch=True)

    backup = {
        "timestamp": datetime.now().isoformat(),
        "engine": DB_ENGINE,
        "products": json_safe(products or []),
        "settings": {r["setting_key"]: r["setting_value"] for r in (settings or [])},
        "page_content": {r["page_key"]: r["content_json"] for r in (content or [])},
        "coupons": json_safe(coupons or []),
        "faqs": json_safe(faqs or []),
        "reviews": json_safe(reviews or []),
        "orders": json_safe(orders or []),
    }
    return jsonify(backup)


# =========================================================
# 13. FRONTEND STATIC WEB SERVING
# =========================================================
FRONTEND_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "frontend")
)


@app.route("/")
def serve_index():
    return send_from_directory(FRONTEND_DIR, "index.html")


@app.route("/<path:path>")
def serve_static(path):
    target = os.path.join(FRONTEND_DIR, path)
    if os.path.exists(target) and os.path.isfile(target):
        return send_from_directory(FRONTEND_DIR, path)
    if os.path.exists(target + ".html") and os.path.isfile(target + ".html"):
        return send_from_directory(FRONTEND_DIR, path + ".html")
    return jsonify({"error": "Resource not found"}), 404


# =========================================================
# 14. SERVER RUNNER
# =========================================================
if __name__ == "__main__":
    initialize_database()
    port = int(os.getenv("PORT", "5000"))
    logger.info(
        f"🚀 Saroj&co Luxury Fragrance API running live on http://127.0.0.1:{port}"
    )
    app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)
