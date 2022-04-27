CREATE TABLE `users`(
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `username` VARCHAR(255) NOT NULL,
    `display_name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `image` VARCHAR(255) NULL,
    `bio` TEXT NULL,
    `password` VARCHAR(255) NOT NULL,
    `token` VARCHAR(255) NULL
);
ALTER TABLE
    `users` ADD INDEX `users_username_index`(`username`);
ALTER TABLE
    `users` ADD INDEX `users_email_index`(`email`);
CREATE TABLE `sets`(
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `icon` CHAR(255) NOT NULL
);
CREATE TABLE `subsets`(
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `name` VARCHAR(255) NOT NULL,
    `set` CHAR(36) NOT NULL
);
ALTER TABLE
    `subsets` ADD INDEX `subsets_set_index`(`set`);
CREATE TABLE `memberships`(
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `user` CHAR(36) NOT NULL,
    `set` CHAR(36) NOT NULL,
    `admin` TINYINT(1) NOT NULL
);
ALTER TABLE
    `memberships` ADD INDEX `memberships_user_index`(`user`);
ALTER TABLE
    `memberships` ADD INDEX `memberships_set_index`(`set`);
CREATE TABLE `messages`(
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `text` TEXT NOT NULL,
    `subset` CHAR(36) NOT NULL,
    `sender` CHAR(36) NOT NULL,
    `send_time` DATETIME NOT NULL
);
ALTER TABLE
    `messages` ADD INDEX `messages_subset_index`(`subset`);
ALTER TABLE
    `messages` ADD INDEX `messages_send_time_index`(`send_time`);
ALTER TABLE
    `subsets` ADD CONSTRAINT `subsets_set_foreign` FOREIGN KEY(`set`) REFERENCES `sets`(`id`);
ALTER TABLE
    `memberships` ADD CONSTRAINT `memberships_user_foreign` FOREIGN KEY(`user`) REFERENCES `users`(`id`);
ALTER TABLE
    `memberships` ADD CONSTRAINT `memberships_set_foreign` FOREIGN KEY(`set`) REFERENCES `sets`(`id`);
ALTER TABLE
    `messages` ADD CONSTRAINT `messages_subset_foreign` FOREIGN KEY(`subset`) REFERENCES `subsets`(`id`);
ALTER TABLE
    `messages` ADD CONSTRAINT `messages_sender_foreign` FOREIGN KEY(`sender`) REFERENCES `users`(`id`);