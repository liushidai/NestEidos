CREATE DATABASE nest_eidos
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'zh_CN.UTF-8'
    LC_CTYPE = 'zh_CN.UTF-8'
    TEMPLATE = template0;

-- 用户表
CREATE TABLE user (
    id BIGINT PRIMARY KEY,
    user_name VARCHAR(64) NOT NULL UNIQUE,
    pass_word VARCHAR(255) NOT NULL,
    user_type SMALLINT NOT NULL CHECK (user_type IN (1, 10)),
    user_status SMALLINT NOT NULL DEFAULT 1 CHECK (user_status IN (1, 2)),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- 表注释
COMMENT ON TABLE user IS '用户表';

-- 字段注释
COMMENT ON COLUMN user.id IS '用户ID，由程序使用雪花算法生成';
COMMENT ON COLUMN user.user_name IS '用户名，唯一';
COMMENT ON COLUMN user.pass_word IS '密码，存储加密后的哈希值';
COMMENT ON COLUMN user.user_type IS '用户类型：1-管理员，10-普通用户';
COMMENT ON COLUMN user.user_status IS '用户状态：1-正常，2-封锁，默认为1';
COMMENT ON COLUMN user.created_at IS '创建时间，由程序插入时提供';
COMMENT ON COLUMN user.updated_at IS '更新时间，由程序在每次更新时提供';


-- 相册表
CREATE TABLE album (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    album_name VARCHAR(128) NOT NULL,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- 表注释
COMMENT ON TABLE album IS '相册表';

-- 字段注释
COMMENT ON COLUMN album.id IS '相册ID，由程序使用雪花算法生成';
COMMENT ON COLUMN album.user_id IS '所属用户ID，关联 user.id';
COMMENT ON COLUMN album.album_name IS '相册名称';
COMMENT ON COLUMN album.created_at IS '创建时间，由程序插入时提供';
COMMENT ON COLUMN album.updated_at IS '更新时间，由程序在每次更新时提供';



-- 图片表
CREATE TABLE image (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    album_id BIGINT NOT NULL DEFAULT 0,
    original_name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    file_size BIGINT NOT NULL CHECK (file_size >= 0),
    mime_type VARCHAR(64) NOT NULL,
    width INTEGER NOT NULL CHECK (width > 0),
    height INTEGER NOT NULL CHECK (height > 0),
    hash CHAR(64) NOT NULL,
    original_key VARCHAR(512) NOT NULL,
    webp_key VARCHAR(512),
    avif_key VARCHAR(512),
    has_webp BOOLEAN NOT NULL DEFAULT false,
    has_avif BOOLEAN NOT NULL DEFAULT false,
    convert_webp_param_id BIGINT,
    convert_avif_param_id BIGINT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- 表注释
COMMENT ON TABLE image IS '图片元数据表';

-- 字段注释
COMMENT ON COLUMN image.id IS '图片ID，由程序使用雪花算法生成';
COMMENT ON COLUMN image.user_id IS '所属用户ID，关联 user.id';
COMMENT ON COLUMN image.album_id IS '所属相册ID；若未归属任何相册，则为0';
COMMENT ON COLUMN image.original_name IS '原始文件名（含扩展名），如 photo.jpg';
COMMENT ON COLUMN image.title IS '图片标题，用户可自定义，可为空';
COMMENT ON COLUMN image.file_size IS '原始文件大小，单位：字节';
COMMENT ON COLUMN image.mime_type IS '原始 MIME 类型，如 image/jpeg、image/png';
COMMENT ON COLUMN image.width IS '原始图片宽度，单位：像素';
COMMENT ON COLUMN image.height IS '原始图片高度，单位：像素';
COMMENT ON COLUMN image.hash IS '原始文件的 SHA256 哈希值，64位小写十六进制字符串，用于去重';
COMMENT ON COLUMN image.original_key IS '原始文件在对象存储中的路径或键（key）';
COMMENT ON COLUMN image.webp_key IS 'WebP 格式文件在对象存储中的路径，若未生成则为 NULL';
COMMENT ON COLUMN image.avif_key IS 'AVIF 格式文件在对象存储中的路径，若未生成则为 NULL';
COMMENT ON COLUMN image.has_webp IS '是否已成功生成 WebP 格式';
COMMENT ON COLUMN image.has_avif IS '是否已成功生成 AVIF 格式';
COMMENT ON COLUMN image.convert_webp_param_id IS '生成 WebP 时使用的转换参数配置ID，关联转换参数表（如 convert_params.id）';
COMMENT ON COLUMN image.convert_avif_param_id IS '生成 AVIF 时使用的转换参数配置ID，关联转换参数表（如 convert_params.id）';
COMMENT ON COLUMN image.created_at IS '创建时间，由程序插入时提供';
COMMENT ON COLUMN image.updated_at IS '更新时间，由程序在每次更新时提供';