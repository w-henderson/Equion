CREATE TABLE `invites`(
    `id` CHAR(36) NOT NULL PRIMARY KEY,
    `set_id` CHAR(36) NOT NULL,
    `code` VARCHAR(36) NOT NULL UNIQUE,
    `creation_date` DATETIME NOT NULL,
    `expiry_date` DATETIME NULL,
    `uses` INT NOT NULL DEFAULT 0
);
ALTER TABLE
    `invites` ADD INDEX `invites_set_id_index`(`set_id`);
ALTER TABLE
    `invites` ADD INDEX `invites_code_index`(`code`);
ALTER TABLE
    `invites` ADD CONSTRAINT `invites_set_id_foreign` FOREIGN KEY(`set_id`) REFERENCES `sets`(`id`);