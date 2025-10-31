CREATE DATABASE IF NOT EXISTS onlinestore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE onlinestore;

CREATE TABLE IF NOT EXISTS users (
  user_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  full_name VARCHAR(80) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id),
  UNIQUE KEY uq_users_email (email)
);
