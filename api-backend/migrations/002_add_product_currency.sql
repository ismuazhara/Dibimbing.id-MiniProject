ALTER TABLE products
    ADD COLUMN currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
    ADD CONSTRAINT products_currency_code_format
        CHECK (currency_code ~ '^[A-Z]{3}$');
