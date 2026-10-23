CREATE TABLE IF NOT EXISTS mpesa_transactions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id BIGINT UNSIGNED NOT NULL,
  phone_number VARCHAR(12) NOT NULL,
  requested_amount INT UNSIGNED NOT NULL,
  merchant_request_id VARCHAR(100) NULL,
  checkout_request_id VARCHAR(100) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'initiating',
  result_code INT NULL,
  result_description VARCHAR(255) NULL,
  mpesa_receipt_number VARCHAR(32) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_mpesa_checkout_request (checkout_request_id),
  KEY idx_mpesa_sale_id (sale_id)
);
