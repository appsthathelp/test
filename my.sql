CREATE TABLE btcminer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL,
    username VARCHAR(50) NOT NULL,
    referral_id VARCHAR(20) NOT NULL,
    mining_speed DECIMAL(11, 9) DEFAULT 0.000000000,
    amount_mined DECIMAL(11, 9) DEFAULT 0.000000000,
    reward_days INT DEFAULT 0,
    number_of_referral FLOAT DEFAULT 0,
    minimum_withdraw DECIMAL(11, 9) DEFAULT 0.000000000,
    withdraw_status VARCHAR(20) NOT NULL,
    withdraw_message VARCHAR(200) NOT NULL,
    mining_status VARCHAR(20) DEFAULT 'inactive',
    notification_message VARCHAR(500) NOT NULL,
    time_remaining INT DEFAULT 600,
    rewarded BOOLEAN NOT NULL DEFAULT FALSE
);
