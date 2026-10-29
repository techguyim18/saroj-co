import json
import logging
import os
import sqlite3
from typing import Any, cast

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("saroj_db")
logging.basicConfig(level=logging.INFO)

DB_HOST = os.getenv("MYSQL_HOST", "localhost")
DB_PORT = int(os.getenv("MYSQL_PORT", "3306"))
DB_USER = os.getenv("MYSQL_USER", "root")
DB_PASSWORD = os.getenv("MYSQL_PASSWORD", "1234")
DB_NAME = os.getenv("MYSQL_DATABASE", "saroj_co")

# Engine state: "mysql" or "sqlite"
# DB_ENGINE assigned below

SQLITE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "saroj.db")
if not os.path.exists(SQLITE_PATH):
    legacy_sqlite = os.path.join(os.path.dirname(os.path.abspath(__file__)), "nishu.db")
    if os.path.exists(legacy_sqlite):
        try:
            import shutil
            shutil.copy2(legacy_sqlite, SQLITE_PATH)
        except Exception:
            pass


def try_connect_mysql():
    try:
        import mysql.connector

        conn = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            connect_timeout=2,
        )
        cursor = conn.cursor()
        cursor.execute(
            f"CREATE DATABASE IF NOT EXISTS `{DB_NAME}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
        )
        cursor.close()
        conn.close()

        db_conn = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
            connect_timeout=2,
        )
        db_conn.close()
        return True
    except Exception as e:
        logger.info(
            f"MySQL not reachable ({e}). Using robust embedded SQLite database."
        )
        return False


DB_ENGINE = 'mysql' if try_connect_mysql() else 'sqlite'


def get_db_connection():
    global DB_ENGINE
    if DB_ENGINE == "mysql":
        import mysql.connector

        return mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=DB_NAME,
        )
    else:
        conn = sqlite3.connect(SQLITE_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn


def db_query(
    sql: str, params: tuple | list = (), fetch: bool = False, commit: bool = True
) -> Any:
    global DB_ENGINE
    conn = get_db_connection()

    if DB_ENGINE == "mysql":
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute(sql, params)
            if fetch:
                return cursor.fetchall()
            if commit:
                conn.commit()
            return cursor.lastrowid
        finally:
            cursor.close()
            conn.close()
    else:
        # SQLite: translate %s placeholders to ?
        sqlite_sql = sql.replace("%s", "?")
        # Handle MySQL specific syntax like ON DUPLICATE KEY UPDATE -> replace or handle in queries
        cursor = conn.cursor()
        try:
            cursor.execute(sqlite_sql, params)
            if fetch:
                rows = cursor.fetchall()
                return [dict(r) for r in rows]
            if commit:
                conn.commit()
            return cursor.lastrowid
        finally:
            cursor.close()
            conn.close()


def initialize_database():
    global DB_ENGINE
    if try_connect_mysql():
        DB_ENGINE = "mysql"
        logger.info("✦ Connected to MySQL Server database.")
    else:
        DB_ENGINE = "sqlite"
        logger.info(f"✦ Using SQLite database at: {SQLITE_PATH}")

    if DB_ENGINE == "mysql":
        _init_mysql()
    else:
        _init_sqlite()

    _seed_initial_data()


def _init_mysql():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        tables = [
            """
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash VARCHAR(255) NOT NULL,
                phone VARCHAR(30),
                role VARCHAR(30) NOT NULL DEFAULT 'customer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS products (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(180) NOT NULL,
                slug VARCHAR(200) NOT NULL UNIQUE,
                description TEXT,
                category VARCHAR(100) NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                mrp DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                stock INT NOT NULL DEFAULT 0,
                image_url VARCHAR(1000),
                fragrance_notes VARCHAR(255),
                icon VARCHAR(50) DEFAULT '🕯️',
                featured BOOLEAN NOT NULL DEFAULT FALSE,
                active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS addresses (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                recipient_name VARCHAR(100) NOT NULL,
                phone VARCHAR(30) NOT NULL,
                address_line VARCHAR(500) NOT NULL,
                city VARCHAR(100) NOT NULL,
                state VARCHAR(100),
                pincode VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS orders (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_ref VARCHAR(50) NOT NULL UNIQUE,
                user_id INT NULL,
                recipient_name VARCHAR(150),
                phone VARCHAR(50),
                email VARCHAR(255),
                shipping_address TEXT,
                city VARCHAR(100),
                state VARCHAR(100),
                pincode VARCHAR(20),
                subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                coupon_code VARCHAR(50),
                discount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                total DECIMAL(10,2) NOT NULL,
                status VARCHAR(40) NOT NULL DEFAULT 'Order Placed',
                payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery',
                payment_status VARCHAR(40) NOT NULL DEFAULT 'cod_pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS order_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                order_id INT NOT NULL,
                product_id INT NULL,
                product_name VARCHAR(180) NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                quantity INT NOT NULL,
                image_url VARCHAR(1000),
                CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS cart_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                quantity INT NOT NULL DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_cart_user_product (user_id, product_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS wishlist_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_wishlist_user_product (user_id, product_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS site_settings (
                setting_key VARCHAR(100) PRIMARY KEY,
                setting_value TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS page_content (
                page_key VARCHAR(100) PRIMARY KEY,
                content_json LONGTEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS coupons (
                id INT AUTO_INCREMENT PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                discount_type VARCHAR(20) NOT NULL DEFAULT 'percent',
                discount_value DECIMAL(10,2) NOT NULL,
                min_spend DECIMAL(10,2) NOT NULL DEFAULT 0.00,
                label VARCHAR(255),
                active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS faqs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                category VARCHAR(50) NOT NULL DEFAULT 'orders',
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                display_order INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS reviews (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                city VARCHAR(100),
                stars INT NOT NULL DEFAULT 5,
                quote TEXT NOT NULL,
                active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                type VARCHAR(50) NOT NULL DEFAULT 'Contact Message',
                name VARCHAR(100) NOT NULL,
                email VARCHAR(255) NOT NULL,
                phone VARCHAR(50),
                topic VARCHAR(150),
                message TEXT NOT NULL,
                status VARCHAR(40) NOT NULL DEFAULT 'new',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
            """
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            """,
        ]
        for tbl in tables:
            cursor.execute(tbl)
        conn.commit()

        _migrate_mysql_columns(cursor)
        conn.commit()
    finally:
        cursor.close()
        conn.close()



def _migrate_mysql_columns(cursor):
    migrations = [
        ("products", "mrp", "DECIMAL(10,2) NOT NULL DEFAULT 0.00"),
        ("products", "fragrance_notes", "VARCHAR(255) NULL"),
        ("products", "icon", "VARCHAR(50) NULL DEFAULT '🕯️'"),
        ("products", "featured", "BOOLEAN NOT NULL DEFAULT FALSE"),
        ("users", "role", "VARCHAR(30) NOT NULL DEFAULT 'customer'"),
        ("addresses", "state", "VARCHAR(100) NULL"),
        ("orders", "order_ref", "VARCHAR(50) NULL"),
        ("orders", "recipient_name", "VARCHAR(150) NULL"),
        ("orders", "phone", "VARCHAR(50) NULL"),
        ("orders", "email", "VARCHAR(255) NULL"),
        ("orders", "shipping_address", "TEXT NULL"),
        ("orders", "city", "VARCHAR(100) NULL"),
        ("orders", "state", "VARCHAR(100) NULL"),
        ("orders", "pincode", "VARCHAR(20) NULL"),
        ("orders", "subtotal", "DECIMAL(10,2) NOT NULL DEFAULT 0.00"),
        ("orders", "coupon_code", "VARCHAR(50) NULL"),
        ("orders", "discount", "DECIMAL(10,2) NOT NULL DEFAULT 0.00"),
        ("orders", "payment_method", "VARCHAR(50) NOT NULL DEFAULT 'Cash on Delivery'"),
        ("orders", "payment_status", "VARCHAR(50) NOT NULL DEFAULT 'paid'"),
        ("orders", "transaction_ref", "VARCHAR(150) NULL"),
        ("order_items", "image_url", "VARCHAR(1000) NULL"),
        ("contact_messages", "type", "VARCHAR(50) NOT NULL DEFAULT 'Contact Message'"),
        ("contact_messages", "phone", "VARCHAR(50) NULL"),
        ("contact_messages", "topic", "VARCHAR(150) NULL"),
        ("contact_messages", "status", "VARCHAR(40) NOT NULL DEFAULT 'new'"),
    ]
    for table, col, definition in migrations:
        try:
            cursor.execute(f"SHOW COLUMNS FROM `{table}` LIKE '{col}'")
            if not cursor.fetchall():
                cursor.execute(f"ALTER TABLE `{table}` ADD COLUMN `{col}` {definition}")
                logger.info(f"Added column {col} to {table}")
        except Exception as e:
            logger.warning(f"Could not migrate {table}.{col}: {e}")

    # Make orders.user_id and orders.address_id nullable if existing
    try:
        cursor.execute("ALTER TABLE orders MODIFY user_id INT NULL")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE orders MODIFY address_id INT NULL")
    except Exception:
        pass


def _init_sqlite():
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        tables = [
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                phone TEXT,
                role TEXT NOT NULL DEFAULT 'customer',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                slug TEXT NOT NULL UNIQUE,
                description TEXT,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                mrp REAL NOT NULL DEFAULT 0.00,
                stock INTEGER NOT NULL DEFAULT 0,
                image_url TEXT,
                fragrance_notes TEXT,
                icon TEXT DEFAULT '🕯️',
                featured BOOLEAN NOT NULL DEFAULT 0,
                active BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS addresses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                recipient_name TEXT NOT NULL,
                phone TEXT NOT NULL,
                address_line TEXT NOT NULL,
                city TEXT NOT NULL,
                state TEXT,
                pincode TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_ref TEXT NOT NULL UNIQUE,
                user_id INTEGER,
                recipient_name TEXT,
                phone TEXT,
                email TEXT,
                shipping_address TEXT,
                city TEXT,
                state TEXT,
                pincode TEXT,
                subtotal REAL NOT NULL DEFAULT 0.00,
                coupon_code TEXT,
                discount REAL NOT NULL DEFAULT 0.00,
                total REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'Order Placed',
                payment_method TEXT NOT NULL DEFAULT 'Cash on Delivery',
                payment_status TEXT NOT NULL DEFAULT 'cod_pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS order_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INTEGER NOT NULL,
                product_id INTEGER,
                product_name TEXT NOT NULL,
                unit_price REAL NOT NULL,
                quantity INTEGER NOT NULL,
                image_url TEXT,
                FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS cart_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, product_id)
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS wishlist_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, product_id)
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS site_settings (
                setting_key TEXT PRIMARY KEY,
                setting_value TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS page_content (
                page_key TEXT PRIMARY KEY,
                content_json TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS coupons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT NOT NULL UNIQUE,
                discount_type TEXT NOT NULL DEFAULT 'percent',
                discount_value REAL NOT NULL,
                min_spend REAL NOT NULL DEFAULT 0.00,
                label TEXT,
                active BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS faqs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL DEFAULT 'orders',
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                display_order INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                city TEXT,
                stars INTEGER NOT NULL DEFAULT 5,
                quote TEXT NOT NULL,
                active BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS contact_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT NOT NULL DEFAULT 'Contact Message',
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                topic TEXT,
                message TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'new',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS newsletter_subscribers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """,
        ]
        for tbl in tables:
            cursor.execute(tbl)
        conn.commit()
    finally:
        cursor.close()
        conn.close()


def _seed_initial_data():
    # 1. Site Settings
    default_settings = [
        ("theme_mode", "classic"),
        ("festival_decoration", "none"),
        (
            "announcement_text",
            "Free shipping across India · Cash on Delivery available",
        ),
        ("announcement_active", "true"),
        ("brand_name", "Saroj&co"),
        ("hero_eyebrow", "The Art of Fragrance"),
        ("hero_title", "Make Space for Beautiful Moments."),
        (
            "hero_subtitle",
            "Discover thoughtfully crafted fragrances for your home, your rituals and the moments that matter.",
        ),
        ("hero_btn1_text", "Explore Collection"),
        ("hero_btn1_link", "products.html"),
        ("hero_btn2_text", "Our Story"),
        ("hero_btn2_link", "about.html"),
        ("support_email", "support@sarojandco.example"),
        ("support_phone", "+91 98765 43210"),
        ("support_hours", "Monday – Friday, 9:00 AM – 6:00 PM IST"),
        (
            "footer_bio",
            "Thoughtfully created fragrances for beautiful spaces and everyday rituals.",
        ),
        ("copyright_text", "© 2026 Saroj&co. All rights reserved."),
        ("enable_cod", "false"),
        ("enable_online_payment", "true"),
        ("enable_upi", "true"),
        ("enable_cards", "true"),
        ("enable_netbanking", "true"),
        ("upi_id", "sarojandco@upi"),
        ("upi_name", "Saroj&co Luxury Fragrance"),
        ("razorpay_key_id", "rzp_test_SarojCoLuxury2026"),
        ("payment_note", "100% Secure Payment via UPI (GPay, PhonePe, Paytm, QR) & Cards"),
    ]
    for k, v in default_settings:
        if DB_ENGINE == "mysql":
            db_query(
                """
                INSERT INTO site_settings (setting_key, setting_value)
                VALUES (%s, %s)
                ON DUPLICATE KEY UPDATE setting_key=setting_key
                """,
                (k, v),
            )
        else:
            db_query(
                "INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES (%s, %s)",
                (k, v),
            )

    # 2. Curated Luxury Products (All 19)
    products_seed = [
        (
            "Velvet Amber Candle",
            "velvet-amber-candle",
            "A warm, enveloping soy candle hand-poured in an amber glass jar. 250g, around 45 hours of slow, even burn with lead-free cotton wick.",
            "candles",
            1499.00,
            1799.00,
            25,
            "https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=800&q=80",
            "Amber · Vanilla · Musk",
            "🕯️",
            1,
        ),
        (
            "Wild French Lavender Candle",
            "wild-french-lavender",
            "Calming French lavender with a green herbal heart. Crafted for slow evenings, relaxation rituals and restorative sleep.",
            "candles",
            1199.00,
            1399.00,
            30,
            "https://images.unsplash.com/photo-1508759073847-9ca702cec7d2?auto=format&fit=crop&w=800&q=80",
            "Lavender · Sage · Cedar",
            "🌿",
            1,
        ),
        (
            "Sandalwood Serenity Candle",
            "sandalwood-serenity",
            "Creamy Mysore sandalwood with a soft woody finish. A meditative, grounding scent for quiet corners and mindful reading.",
            "candles",
            1349.00,
            1599.00,
            18,
            "https://images.unsplash.com/photo-1572726729207-a78d6feb18d7?auto=format&fit=crop&w=800&q=80",
            "Sandalwood · Tonka · Cream",
            "🌙",
            1,
        ),
        (
            "Citrus Bloom Candle",
            "citrus-bloom",
            "Bright, sparkling Mediterranean citrus that awakens any living space instantly. Perfect for sunny mornings and lively gatherings.",
            "candles",
            999.00,
            1199.00,
            40,
            "https://images.unsplash.com/photo-1602874801007-bd458bb1b8b8?auto=format&fit=crop&w=800&q=80",
            "Bergamot · Lemon · Neroli",
            "🍋",
            0,
        ),
        (
            "Vanilla Chai Candle",
            "vanilla-chai",
            "The cosy comfort of freshly brewed spiced masala chai and Madagascar vanilla, hand-poured in small artisanal batches.",
            "candles",
            1099.00,
            1299.00,
            22,
            "https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=800&q=80",
            "Vanilla · Cardamom · Cinnamon",
            "☕",
            0,
        ),
        (
            "Rose Petal Candle",
            "rose-petal",
            "Soft, romantic Kannauj damask rose with an airy white musk base. Delicate, elegant and evocative on any bedside table.",
            "candles",
            1249.00,
            1449.00,
            20,
            "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=800&q=80",
            "Rose · Peony · White Musk",
            "🌸",
            0,
        ),
        (
            "Cedar & Bergamot Diffuser",
            "cedar-bergamot-diffuser",
            "A fresh woody reed diffuser that scents your home for up to 10 continuous weeks. Includes 8 natural rattan reeds. 150ml.",
            "diffusers",
            2199.00,
            2499.00,
            15,
            "https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=800&q=80",
            "Cedarwood · Bergamot · Vetiver",
            "🌲",
            1,
        ),
        (
            "Ocean Mist Diffuser",
            "ocean-mist-diffuser",
            "Crisp, breezy coastal air captured in a frosted bottle. Light, airy, ozone-infused and wonderfully invigorating. 150ml.",
            "diffusers",
            1899.00,
            2199.00,
            16,
            "https://images.unsplash.com/photo-1547887537-6158d64c35b3?auto=format&fit=crop&w=800&q=80",
            "Sea Salt · Driftwood · Mint",
            "🌊",
            1,
        ),
        (
            "White Tea & Fig Diffuser",
            "white-tea-fig-diffuser",
            "Delicate organic white tea notes with ripe Mediterranean fig. A soothing, spa-like fragrance for peaceful interiors. 150ml.",
            "diffusers",
            1999.00,
            2299.00,
            12,
            "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
            "White Tea · Fig · Green Leaves",
            "🍃",
            0,
        ),
        (
            "Rose Oud Diffuser",
            "rose-oud-diffuser",
            "Rich, intoxicating and opulent. Deep oriental agarwood paired with velvet red rose petals. Our most lavish reed diffuser. 150ml.",
            "diffusers",
            2399.00,
            2799.00,
            10,
            "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
            "Rose · Oud · Amber",
            "🌹",
            0,
        ),
        (
            "Linen Fresh Room Spray",
            "linen-fresh-spray",
            "Crisp, freshly line-dried linen aroma. Mist generously over curtains, sofas, bedding and entryways for an instantaneous refresh. 100ml.",
            "sprays",
            799.00,
            899.00,
            50,
            "https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?auto=format&fit=crop&w=800&q=80",
            "Cotton · Lily · Clean Musk",
            "✨",
            1,
        ),
        (
            "Lemongrass Room Mist",
            "lemongrass-mist",
            "Zesty, stimulating botanicals that deodorize and uplift any space in seconds. Formulated with natural botanical essential oils. 100ml.",
            "sprays",
            749.00,
            849.00,
            45,
            "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=800&q=80",
            "Lemongrass · Ginger · Basil",
            "🌾",
            0,
        ),
        (
            "Jasmine Pillow Mist",
            "jasmine-pillow-mist",
            "A gentle bedtime linen mist infused with soothing night-blooming mogra jasmine and Roman chamomile for serene sleep rituals. 100ml.",
            "sprays",
            849.00,
            949.00,
            35,
            "https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=800&q=80",
            "Jasmine · Chamomile · Vanilla",
            "🌼",
            0,
        ),
        (
            "Amber Wax Melts (6 pcs)",
            "amber-wax-melts",
            "Six slow-melting soy wax cubes that fill a large room with rich warm amber. Flame-free fragrance release for ceramic burners.",
            "melts",
            499.00,
            599.00,
            60,
            "https://images.unsplash.com/photo-1605651202774-7d573fd3f12d?auto=format&fit=crop&w=800&q=80",
            "Amber · Honey · Vanilla",
            "🍯",
            1,
        ),
        (
            "Lavender Wax Melts (6 pcs)",
            "lavender-wax-melts",
            "Soothing natural lavender melts for your wax warmer. 6 hand-poured botanical pieces per pack, offering over 60 hours of aroma.",
            "melts",
            449.00,
            549.00,
            60,
            "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?auto=format&fit=crop&w=800&q=80",
            "Lavender · Eucalyptus · Thyme",
            "💜",
            0,
        ),
        (
            "Cinnamon Spice Wax Melts (6 pcs)",
            "cinnamon-spice-melts",
            "Warming festive spices and sweet citrus peel. Fills your home with festive warmth and hospitality. Six pieces per pack.",
            "melts",
            479.00,
            579.00,
            55,
            "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
            "Cinnamon · Clove · Orange Peel",
            "🍂",
            0,
        ),
        (
            "Relax Ritual Gift Set",
            "relax-ritual-gift-set",
            "Includes our Wild French Lavender candle, Linen Fresh room mist, and a solid brass candle snuffer, presented in a luxury gift box.",
            "gift-sets",
            2999.00,
            3499.00,
            11,
            "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=800&q=80",
            "Candle · Room Mist · Brass Snuffer",
            "🎁",
            1,
        ),
        (
            "Festive Glow Hamper",
            "festive-glow-hamper",
            "Our finest festive centerpiece: two soy candles, a reed diffuser, and aromatic wax melts with festive matches and gold ribbon.",
            "gift-sets",
            3999.00,
            4599.00,
            8,
            "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=800&q=80",
            "2 Candles · Reed Diffuser · Wax Melts",
            "🪔",
            1,
        ),
        (
            "Mini Candle Discovery Trio",
            "mini-candle-trio",
            "Three travel-size soy candles in Velvet Amber, Wild Lavender and Citrus Bloom. A delightful tasting set and perfect gift.",
            "gift-sets",
            1799.00,
            2099.00,
            28,
            "https://images.unsplash.com/photo-1577083552431-6e5fd01aa342?auto=format&fit=crop&w=800&q=80",
            "3 × 75g Travel Candles",
            "🎀",
            0,
        ),
    ]

    for p in products_seed:
        if DB_ENGINE == "mysql":
            db_query(
                """
                INSERT IGNORE INTO products
                (name, slug, description, category, price, mrp, stock, image_url, fragrance_notes, icon, featured)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                p,
            )
        else:
            db_query(
                """
                INSERT OR IGNORE INTO products
                (name, slug, description, category, price, mrp, stock, image_url, fragrance_notes, icon, featured)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                p,
            )

    # 3. Default Coupons
    default_coupons = [
        ("SAROJ10", "percent", 10.0, 0.0, "10% off with Saroj&co"),
        ("NISHU10", "percent", 10.0, 0.0, "10% off your entire order"),
        ("WELCOME200", "flat", 200.0, 1000.0, "₹200 off on orders above ₹1,000"),
        (
            "FESTIVE25",
            "percent",
            25.0,
            2000.0,
            "Festive special: 25% off above ₹2,000",
        ),
    ]
    for c in default_coupons:
        if DB_ENGINE == "mysql":
            db_query(
                "INSERT IGNORE INTO coupons (code, discount_type, discount_value, min_spend, label) VALUES (%s, %s, %s, %s, %s)",
                c,
            )
        else:
            db_query(
                "INSERT OR IGNORE INTO coupons (code, discount_type, discount_value, min_spend, label) VALUES (%s, %s, %s, %s, %s)",
                c,
            )

    # 4. Default FAQs
    faqs_seed = [
        (
            "orders",
            "How does Cash on Delivery work?",
            "Add items to your bag, proceed to Checkout, enter your delivery address and tap 'Confirm & Place Order'. You only pay when the courier brings the parcel to your doorstep.",
            1,
        ),
        (
            "orders",
            "How can I track my order?",
            "Sign in to your Profile page and open 'My Orders'. You can check the live tracking status (Placed, Packed, Shipped, Delivered) for every order you have placed.",
            2,
        ),
        (
            "orders",
            "Are the products gift-ready?",
            "Yes! Every Saroj&co parcel arrives in our signature gift-ready presentation box, and our Gift Sets come hand-wrapped with satin ribbon and botanical cards.",
            3,
        ),
        (
            "shipping",
            "How long does delivery take across India?",
            "Orders are hand-packed and dispatched within 1–2 business days. Metro cities usually arrive in 2–4 working days; the rest of India takes 4–6 working days.",
            4,
        ),
        (
            "shipping",
            "Is shipping free?",
            "Yes, shipping is 100% free on all orders across India with no minimum cart requirement.",
            5,
        ),
        (
            "returns",
            "My candle arrived damaged. What should I do?",
            "Glassware is delicate, so we double-box every order. If your parcel arrives damaged, send us clear photos via the Contact page within 48 hours and we will ship an immediate replacement free of charge.",
            6,
        ),
        (
            "returns",
            "What is your return policy?",
            "Unburned candles in their original presentation box can be returned or exchanged within 7 days of delivery. Used or bespoke customized items cannot be returned.",
            7,
        ),
        (
            "products",
            "How do I prevent candle tunneling?",
            "On the first burn, allow the candle to burn continuously for 2–3 hours until the melted wax reaches the very edge of the glass jar. This establishes an even burn memory.",
            8,
        ),
        (
            "products",
            "Why should I trim the wick before lighting?",
            "Always trim the wick to about 5mm before every lighting. It prevents excess soot, stops the flame from dancing, and extends the total burn life of your candle.",
            9,
        ),
    ]
    existing_faq_count = db_query("SELECT COUNT(*) as cnt FROM faqs", fetch=True)
    if not existing_faq_count or existing_faq_count[0]["cnt"] == 0:
        for f in faqs_seed:
            db_query(
                "INSERT INTO faqs (category, question, answer, display_order) VALUES (%s, %s, %s, %s)",
                f,
            )

    # 5. Default Reviews
    reviews_seed = [
        (
            "Aanya",
            "Mumbai",
            5,
            "The Velvet Amber candle filled my whole living room. Burns evenly, smells incredible and looks gorgeous on my coffee table.",
        ),
        (
            "Rohan",
            "Jaipur",
            5,
            "Ordered the Relax Ritual set for my sister's housewarming. The packaging and hand-written note felt so premium.",
        ),
        (
            "Meera",
            "Delhi",
            5,
            "Cedar & Bergamot diffuser is subtle, crisp and lasts for weeks without fading. Highly recommend Saroj&co to fragrance lovers!",
        ),
    ]
    existing_rev_count = db_query("SELECT COUNT(*) as cnt FROM reviews", fetch=True)
    if not existing_rev_count or existing_rev_count[0]["cnt"] == 0:
        for r in reviews_seed:
            db_query(
                "INSERT INTO reviews (name, city, stars, quote) VALUES (%s, %s, %s, %s)",
                r,
            )


if __name__ == "__main__":
    initialize_database()
