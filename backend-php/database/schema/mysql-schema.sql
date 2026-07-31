/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `contratti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contratti` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `codice_cnel` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `nome_contratto` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `partiDatorialiFirmatarie` text COLLATE utf8mb4_unicode_ci,
  `partiSindacaliFirmatarie` text COLLATE utf8mb4_unicode_ci,
  `data_decorrenza` date DEFAULT NULL,
  `data_scadenza` date DEFAULT NULL,
  `ultimo_accordo_vigente` tinyint(1) NOT NULL DEFAULT '0',
  `tipologia_contratto` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ore_settimanali_teoriche` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dipendente_orari_settimanali`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dipendente_orari_settimanali` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `dipendente_id` bigint unsigned NOT NULL,
  `giorno_settimana` tinyint NOT NULL COMMENT '0=Domenica, 1=Lunedì, 2=Martedì, 3=Mercoledì, 4=Giovedì, 5=Venerdì, 6=Sabato',
  `ore_giornaliere_previste` decimal(5,2) NOT NULL COMMENT 'Ore lavorative previste per questo giorno secondo il contratto individuale',
  `turno1_dalle` time DEFAULT NULL,
  `turno1_alle` time DEFAULT NULL,
  `turno2_dalle` time DEFAULT NULL,
  `turno2_alle` time DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dip_orari_unique` (`dipendente_id`,`giorno_settimana`),
  CONSTRAINT `dipendente_orari_settimanali_dipendente_id_foreign` FOREIGN KEY (`dipendente_id`) REFERENCES `dipendenti` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dipendente_regola_calcolo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dipendente_regola_calcolo` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `dipendente_id` bigint unsigned NOT NULL,
  `regola_calcolo_contratto_id` bigint unsigned NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dipendente_regola_calcolo_dipendente_id_unique` (`dipendente_id`),
  KEY `dipendente_regola_calcolo_dipendente_id_index` (`dipendente_id`),
  KEY `dipendente_regola_calcolo_regola_calcolo_contratto_id_index` (`regola_calcolo_contratto_id`),
  CONSTRAINT `dipendente_regola_calcolo_dipendente_id_foreign` FOREIGN KEY (`dipendente_id`) REFERENCES `dipendenti` (`id`) ON DELETE CASCADE,
  CONSTRAINT `dipendente_regola_calcolo_regola_calcolo_contratto_id_foreign` FOREIGN KEY (`regola_calcolo_contratto_id`) REFERENCES `regole_calcolo_contratto` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dipendenti`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dipendenti` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `contratto_id` bigint unsigned DEFAULT NULL,
  `tipo_contratto` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'indeterminato',
  `data_scadenza_contratto` date DEFAULT NULL,
  `codice_fiscale` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sesso` enum('M','F') COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'M = Maschio, F = Femmina',
  `iban` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `livello` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mansione` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_assunzione` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `percentuale_part_time` decimal(5,2) NOT NULL DEFAULT '100.00',
  `ore_settimanali` decimal(5,2) DEFAULT NULL COMMENT 'Ore settimanali del profilo orario specifico del dipendente',
  `giorni_lavorativi_settimanali` tinyint NOT NULL DEFAULT '5',
  PRIMARY KEY (`id`),
  UNIQUE KEY `dipendenti_codice_fiscale_unique` (`codice_fiscale`),
  KEY `dipendenti_user_id_foreign` (`user_id`),
  KEY `dipendenti_contratto_id_foreign` (`contratto_id`),
  CONSTRAINT `dipendenti_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`),
  KEY `failed_jobs_connection_queue_failed_at_index` (`connection`,`queue`,`failed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` smallint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `model_has_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `model_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`model_id`,`model_type`),
  KEY `model_has_permissions_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `model_has_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `model_has_roles` (
  `role_id` bigint unsigned NOT NULL,
  `model_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`role_id`,`model_id`,`model_type`),
  KEY `model_has_roles_model_id_model_type_index` (`model_id`,`model_type`),
  CONSTRAINT `model_has_roles_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `permissions_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` bigint unsigned NOT NULL,
  `name` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`),
  KEY `personal_access_tokens_expires_at_index` (`expires_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `presenze`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `presenze` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `dipendente_id` bigint unsigned NOT NULL,
  `data` date NOT NULL,
  `ore_ordinarie` decimal(4,2) NOT NULL DEFAULT '0.00',
  `ore_straordinarie` decimal(4,2) NOT NULL DEFAULT '0.00',
  `ore_eccedenti` decimal(5,2) DEFAULT NULL,
  `ore_causale` decimal(4,2) NOT NULL DEFAULT '0.00',
  `causale` enum('lavoro','ferie','permesso_rol','permesso_retribuito','permesso_non_retribuito','malattia','maternita','infortunio','assemblea','sciopero','cassa_integrazione') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'lavoro',
  `modalita_lavoro` enum('in_sede','smart_working','trasferta') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `stato` enum('bozza','inviato','approvato','rifiutato','reinviato') COLLATE utf8mb4_unicode_ci DEFAULT 'bozza',
  `data_inizio_cassa_integrazione` date DEFAULT NULL,
  `data_fine_cassa_integrazione` date DEFAULT NULL,
  `percentuale_cassa_integrazione` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `giustificativo_trasferta_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `protocollo_malattia` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `data_inizio_malattia` date DEFAULT NULL,
  `data_fine_malattia` date DEFAULT NULL,
  `giustificativo_infortunio_path` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `warning` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usa_qr` tinyint(1) NOT NULL DEFAULT '0',
  `ora_ingresso` time DEFAULT NULL,
  `ora_uscita` time DEFAULT NULL,
  `pausa_ore` decimal(5,2) NOT NULL DEFAULT '0.00',
  `fonte_dato` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'MANUALE',
  PRIMARY KEY (`id`),
  UNIQUE KEY `presenze_dipendente_id_data_unique` (`dipendente_id`,`data`),
  CONSTRAINT `presenze_dipendente_id_foreign` FOREIGN KEY (`dipendente_id`) REFERENCES `dipendenti` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `regole_calcolo_contratto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `regole_calcolo_contratto` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `contratto_id` bigint unsigned NOT NULL,
  `descrizione` text COLLATE utf8mb4_unicode_ci,
  `ore_settimanali_teoriche` decimal(5,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `regole_calcolo_contratto_contratto_id_index` (`contratto_id`),
  CONSTRAINT `regole_calcolo_contratto_contratto_id_foreign` FOREIGN KEY (`contratto_id`) REFERENCES `contratti` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `role_has_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_has_permissions` (
  `permission_id` bigint unsigned NOT NULL,
  `role_id` bigint unsigned NOT NULL,
  PRIMARY KEY (`permission_id`,`role_id`),
  KEY `role_has_permissions_role_id_foreign` (`role_id`),
  CONSTRAINT `role_has_permissions_permission_id_foreign` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_has_permissions_role_id_foreign` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `guard_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `roles_name_guard_name_unique` (`name`,`guard_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (1,'0001_01_01_000000_create_users_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (2,'0001_01_01_000001_create_cache_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (3,'0001_01_01_000002_create_jobs_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (4,'2026_06_16_152157_create_personal_access_tokens_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (5,'2026_06_18_122911_create_permission_tables',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (6,'2026_06_21_120841_create_contratti_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (7,'2026_06_21_121109_create_dipendenti_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (8,'2026_06_21_131542_create_presenze_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (9,'2026_06_21_140212_add_ore_causale_to_presenze_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (10,'2026_06_24_000000_add_part_time_and_giorni_lavorativi_to_dipendenti',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (11,'2026_06_24_042332_add_dettagli_avanzati_to_presenze_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (12,'2026_06_26_000001_update_contratti_table_for_cnel_data',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (13,'2026_06_26_000002_create_regole_calcolo_contratto_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (14,'2026_06_26_000003_update_dipendenti_table_for_regole_calcolo',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (15,'2026_06_26_120000_remove_soglie_maggiorazione_from_regole_calcolo',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (16,'2026_06_26_120001_remove_regola_calcolo_id_from_dipendenti',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (17,'2026_06_26_130000_add_parti_firmatarie_to_contratti',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (18,'2026_06_26_140000_change_parti_firmatarie_to_text',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (19,'2026_06_26_174132_update_nome_contratto_length',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (20,'2026_06_27_045437_fix_h011_contratto_data',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (21,'2026_06_27_050427_fix_cnel_data_disaccoppiati',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (22,'2026_06_27_053630_make_ore_settimanali_nullable',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (23,'2026_06_27_120000_create_dipendente_orari_settimanali_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (24,'2026_06_27_120001_add_ore_supplementari_to_presenze_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (25,'2026_06_27_180000_add_turni_to_dipendente_orari_settimanali_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (26,'2026_06_28_075056_add_tipologia_contratto_to_contratti_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (27,'2026_06_29_000000_add_reinviato_to_stato_enum',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (28,'2026_06_29_093205_add_warning_to_presenze_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (29,'2026_06_29_112526_rename_ore_supplementari_to_ore_eccedenti_in_presenze_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (30,'2026_07_03_074622_add_sciopero_to_causale_enum_in_presenze_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (31,'2026_07_03_082528_add_cassa_integrazione_to_presenze_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (32,'2026_07_03_085101_add_percentuale_cassa_integrazione_to_presenze_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (33,'2026_07_03_150000_add_permessi_retribuiti_non_retribuiti_to_causale_enum',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (34,'2026_07_04_000001_add_profilo_orario_to_regole_calcolo_contratto',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (35,'2026_07_04_000002_add_ore_settimanali_to_contratti_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (36,'2026_07_04_000003_remove_nome_profilo_from_regole_calcolo_contratto',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (37,'2026_07_04_000004_add_ore_settimanali_to_dipendenti_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (38,'2026_07_16_140616_add_tipo_contratto_and_data_scadenza_to_dipendenti',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (39,'2026_07_22_000001_add_qr_fields_to_presenze_table',1);
INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES (40,'2026_07_31_082438_add_sesso_to_dipendenti_table',2);
