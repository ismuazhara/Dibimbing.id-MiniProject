CREATE TABLE products (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(120) NOT NULL,
    price       NUMERIC(12, 2) NOT NULL,
    image_url   TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT products_name_length
        CHECK (char_length(btrim(name)) BETWEEN 3 AND 120),
    CONSTRAINT products_price_positive
        CHECK (price > 0),
    CONSTRAINT products_image_url_not_blank
        CHECK (char_length(btrim(image_url)) > 0),
    CONSTRAINT products_description_min_length
        CHECK (char_length(btrim(description)) >= 20)
);

CREATE TABLE product_variants (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    color       VARCHAR(80) NOT NULL,
    size        VARCHAR(40) NOT NULL,
    quantity    INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT product_variants_color_not_blank
        CHECK (char_length(btrim(color)) > 0),
    CONSTRAINT product_variants_size_not_blank
        CHECK (char_length(btrim(size)) > 0),
    CONSTRAINT product_variants_quantity_nonnegative
        CHECK (quantity >= 0),
    CONSTRAINT product_variants_product_color_size_unique
        UNIQUE (product_id, color, size)
);

CREATE INDEX product_variants_product_id_idx
    ON product_variants (product_id);
