CREATE DATABASE nest_eidos
    WITH 
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'zh_CN.UTF-8'
    LC_CTYPE = 'zh_CN.UTF-8'
    TEMPLATE = template0;

-- 用户表
CREATE TABLE "user" (
    id BIGINT PRIMARY KEY,
    user_name VARCHAR(64) NOT NULL UNIQUE,
    pass_word VARCHAR(255) NOT NULL,
    user_type SMALLINT NOT NULL CHECK (user_type IN (1, 10)),
    user_status SMALLINT NOT NULL DEFAULT 1 CHECK (user_status IN (1, 2)),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

-- 表注释
COMMENT ON TABLE "user" IS '用户表';

-- 字段注释
COMMENT ON COLUMN "user".id IS '用户ID，由程序使用雪花算法生成';
COMMENT ON COLUMN "user".user_name IS '用户名，唯一';
COMMENT ON COLUMN "user".pass_word IS '密码，存储加密后的哈希值';
COMMENT ON COLUMN "user".user_type IS '用户类型：1-管理员，10-普通用户';
COMMENT ON COLUMN "user".user_status IS '用户状态：1-正常，2-封锁，默认为1';
COMMENT ON COLUMN "user".created_at IS '创建时间，由程序插入时提供';
COMMENT ON COLUMN "user".updated_at IS '更新时间，由程序在每次更新时提供';


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

--  file 表（存储文件内容元数据，用于去重）
CREATE TABLE file (
    id BIGINT PRIMARY KEY,

    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);


-- image 表（业务层图片实例）
CREATE TABLE image (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    album_id BIGINT NOT NULL DEFAULT 0,
    original_name VARCHAR(255) NOT NULL,
    title VARCHAR(255),
    image_hash CHAR(64) NOT NULL,
    image_size BIGINT NOT NULL CHECK (image_size >= 0),
    image_mime_type VARCHAR(64) NOT NULL,
    image_width INTEGER NOT NULL CHECK (image_width > 0),
    image_height INTEGER NOT NULL CHECK (image_height > 0),
    has_transparency BOOLEAN NOT NULL DEFAULT FALSE,
    is_animated       BOOLEAN NOT NULL DEFAULT FALSE,
    secure_url VARCHAR(512) NOT NULL,
    original_key VARCHAR(512) NOT NULL,
    jpeg_key VARCHAR(512),
    webp_key VARCHAR(512),
    avif_key VARCHAR(512),
    has_jpeg BOOLEAN NOT NULL DEFAULT false,
    has_webp BOOLEAN NOT NULL DEFAULT false,
    has_avif BOOLEAN NOT NULL DEFAULT false,
    convert_jpeg_param JSONB NOT NULL DEFAULT '{}'::jsonb,
    convert_webp_param JSONB NOT NULL DEFAULT '{}'::jsonb,  
    convert_avif_param JSONB NOT NULL DEFAULT '{}'::jsonb,
    default_format VARCHAR(20) NOT NULL DEFAULT 'avif',
    expire_policy SMALLINT NOT NULL,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT '9999-12-31 23:59:59'::timestamp,
    nsfw_score REAL CHECK (nsfw_score >= 0.0 AND nsfw_score <= 1.0),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL,
      -- 约束：default_format 只能是预定义的四种值
    CONSTRAINT chk_image_default_format CHECK (default_format IN ('original','jpeg', 'webp', 'avif')),
        -- 约束：expire_policy 只能是 1, 2, 3
    CONSTRAINT chk_image_expire_policy CHECK (expire_policy IN (1, 2, 3))
);

-- 表注释
COMMENT ON TABLE image IS '图片业务元数据表，通过 file_id 关联 file 表（由代码层维护关联关系）';

-- 字段注释
COMMENT ON COLUMN image.id IS '图片ID，由程序使用雪花算法生成';
COMMENT ON COLUMN image.user_id IS '所属用户ID，关联 user.id';
COMMENT ON COLUMN image.album_id IS '所属相册ID；若未归属任何相册，则为0';
COMMENT ON COLUMN image.original_name IS '原始文件名（含扩展名），如 photo.jpg';
COMMENT ON COLUMN image.title IS '图片标题，用户可自定义，可为空';
COMMENT ON COLUMN image.image_hash IS '文件内容的 SHA256 哈希值 暂时不参与业务逻辑 不用于去重';
COMMENT ON COLUMN image.image_size IS '原始文件大小，单位：字节';
COMMENT ON COLUMN image.image_mime_type IS '原始 MIME 类型，如 image/jpeg、image/png';
COMMENT ON COLUMN image.image_width IS '原始图片宽度，单位：像素（仅适用于图片）';
COMMENT ON COLUMN image.image_height IS '原始图片高度，单位：像素（仅适用于图片）';
COMMENT ON COLUMN image.has_transparency IS '原图是否包含透明通道（Alpha 通道），例如 PNG/WebP/AVIF 中的透明区域';
COMMENT ON COLUMN image.is_animated IS '原图是否为动画图像（多帧），例如 GIF、动画 WebP 或动画 AVIF';
COMMENT ON COLUMN image.secure_url IS '图片的安全 URL，通过id计算得出，防止被遍历';
COMMENT ON COLUMN image.original_key IS '原始文件在对象存储中的路径或键（key） 存储路径：originals/{url}';
COMMENT ON COLUMN image.jpeg_key IS 'JPEG 格式文件在对象存储中的路径，若未生成则为 NULL 存储路径：processed/{url}.jpg';
COMMENT ON COLUMN image.webp_key IS 'WebP 格式文件在对象存储中的路径，若未生成则为 NULL 存储路径：processed/{url}.webp';
COMMENT ON COLUMN image.avif_key IS 'AVIF 格式文件在对象存储中的路径，若未生成则为 NULL 存储路径：processed/{url}.avif';
COMMENT ON COLUMN image.has_jpeg IS '是否已成功生成 JPEG 格式';
COMMENT ON COLUMN image.has_webp IS '是否已成功生成 WebP 格式';
COMMENT ON COLUMN image.has_avif IS '是否已成功生成 AVIF 格式';
COMMENT ON COLUMN image.convert_jpeg_param IS '生成 JPEG 时使用的转换参数配置';
COMMENT ON COLUMN image.convert_webp_param IS '生成 WebP 时使用的转换参数配置';
COMMENT ON COLUMN image.convert_avif_param IS '生成 AVIF 时使用的转换参数配置';
COMMENT ON COLUMN image.default_format IS '图片通过 /i/{url} 路径返回时使用的默认格式。取值：
- ''original'': 返回用户上传的原始文件（不做格式转换）
- ''jpeg'': 返回系统生成的 JPEG 格式
- ''webp'': 返回系统生成的 WebP 格式（推荐默认）
- ''avif'': 返回系统生成的 AVIF 格式
该值在图片处理完成后由系统确定，后期不再变更。';
COMMENT ON COLUMN image.expire_policy IS '图片过期策略：
1 = 永久保存（不过期），
2 = 限时访问但过期后保留文件（如仅隐藏），
3 = 限时访问且过期后自动删除文件。
系统根据此策略决定是否清理存储或拒绝访问。';
COMMENT ON COLUMN image.expires_at IS '图片过期时间。
- 当 expire_policy = 1（永久）时，设为 9999-12-31（表示永不过期）；
- 当 expire_policy = 2 或 3 时，为具体的过期时间（UTC 或业务时区）。
应用层应定期扫描 expires_at < NOW() 的记录进行处理。';
COMMENT ON COLUMN image.nsfw_score IS '图片 NSFW 分数（0.0 到 1.0），用于判断图片是否为 NSFW 内容。
- 分数越高，图片越可能为 NSFW 内容。
- 分数为 0.0 表示图片为 SFW（安全内容），分数为 1.0 表示图片为 NSFW（非安全内容）。
- 该值在图片处理完成后由系统确定，后期不再变更。';
COMMENT ON COLUMN image.created_at IS '创建时间，由程序插入时提供';
COMMENT ON COLUMN image.updated_at IS '更新时间，由程序在每次更新时提供';