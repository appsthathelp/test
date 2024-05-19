const express = require('express');
const mysql = require('mysql');

const app = express();
const port = 3000;

// MySQL Connection
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'btcminer'
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL: ' + err.stack);
    return;
  }
  console.log('Connected to MySQL as id ' + connection.threadId);
});

const apiKey = 'your-api-key';

// Middleware function to validate API key
const validateApiKey = (req, res, next) => {
  const providedApiKey = req.headers['api-key'];
  if (!providedApiKey || providedApiKey !== apiKey) {
    res.status(401).json({ error: 'Unauthorized - Invalid API key' });
    return;
  }
  next(); // Proceed to the next middleware or route handler
};


app.use(validateApiKey);

// Middleware to parse JSON bodies
app.use(express.json());

// Generate a random 7-digit number for userID and referralID
const generateUniqueID = () => {
  return Math.floor(1000000 + Math.random() * 9000000);
};

// API endpoint to fetch user data by user_unique_id
app.get('/user/:userID', (req, res) => {
    const packageCode = req.query.packageCode;

    // Validate package code
    if (packageCode !== "android.kla.js") {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }


    const userID = req.params.userID;
    const query = `SELECT * FROM btcminer WHERE user_id = '${userID}'`;
    connection.query(query, (err, results) => {
      if (err) {
        console.error('Error querying database: ', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      if (results.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      console.log(results[0])

      const user = results[0];
      const balance = user.amount_mined.toFixed(8); // 8 decimal places
      const speed = user.mining_speed.toFixed(8); // 8 decimal places
  
  
      // Prepare response object
      const userData = {
        user_id: user.user_id,
        username: user.username,
        referral_id: user.referral_id, 
        mining_speed: speed,
        amount_mined: balance,
        number_of_referral: user.number_of_referral,
        minimum_withdraw: user.minimum_withdraw,
        withdraw_status: user.withdraw_status,
        withdraw_message: user.withdraw_message,
        mining_status: user.mining_status,
        notification_message: user.notification_message,
        time_remaining: user.time_remaining,
        rewarded: user.rewarded
      };
  
       res.status(200).json(userData);
    });
});

  
// API endpoint to register a new user
app.post('/register', (req, res) => {
  const { username } = req.query;
  const packageCode = req.query.packageCode;

  // Validate package code
   if (packageCode !== "android.kla.js") {
       res.status(403).json({ error: 'Forbidden' });
       return;
   }



  // Generate unique userID and referralID
  const userID = generateUniqueID();
  const referralID = generateUniqueID();

  // Insert user data into the database
  const sql = 'INSERT INTO btcminer (username, user_id, referral_ID, mining_speed, amount_mined, number_of_referral, minimum_withdraw, withdraw_status, withdraw_message, rewarded) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  const values = [username, userID, referralID, 0.00000002, 0.000000000,  0, 0.000000000,  'NotActive', 'Testing the withdrawal', 0];
  connection.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error registering user:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    const insertedUserId = result.insertId;
  
    // Fetch the newly inserted user data
    const fetchUserSql = 'SELECT * FROM btcminer WHERE id = ?';
    connection.query(fetchUserSql, [insertedUserId], (fetchErr, userResult) => {
      if (fetchErr) {
        console.error('Error fetching user data:', fetchErr);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      const newUser = userResult[0];

      console.log('New user registered with ID:', newUser.id);
      res.status(201).json({ message: 'User registered successfully', user: newUser });
    });
  });
});

// API endpoint to update user's mining speed based on userplan
app.put('/update-mining-speed', (req, res) => {
    const { userID, userplan } = req.query;
    const packageCode = req.query.packageCode;

    // Validate package code
    if (packageCode !== "android.kla.js") {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

  
    if (!userID || !userplan) {
      res.status(400).json({ error: 'userID and userplan are required query parameters' });
      return;
    }
  
    let miningSpeed;
  
    // Determine mining speed based on userplan
    switch (userplan) {
      case 'basic':
        miningSpeed = 2;
        break;
      case 'gold':
        miningSpeed = 10;
        break;
      case 'platinum':
        miningSpeed = 8;
        break;
      default:
        res.status(400).json({ error: 'Invalid userplan' });
        return;
    }
  
    // Update mining speed in the database
    const sql = 'UPDATE btcminer SET mining_speed = ? WHERE user_id = ?';
    connection.query(sql, [miningSpeed, userID], (err, result) => {
      if (err) {
        console.error('Error updating mining speed:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
  
      if (result.affectedRows === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
  
      console.log('Mining speed updated for user with ID:', userID);
      res.status(200).json({ message: 'Mining speed updated successfully', userID: userID, mining_speed: miningSpeed });
    });
});
  
// API endpoint to start adding $5 to the amount_mined every second for 10 minutes
app.post('/start-mining/:userID', (req, res) => {
    const { userID } = req.params;
    const packageCode = req.query.packageCode;

    // Validate package code
    if (packageCode !== "android.kla.js") {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

  
    // Validate userID
    if (!userID) {
      res.status(400).json({ error: 'userID is required' });
      return;
    }


    // Set mining_status to active in the database
    const setActiveSql = 'UPDATE btcminer SET mining_status = ? WHERE user_id = ?';
    connection.query(setActiveSql, ['active', userID], (err, result) => {
        if (err) {
          console.error('Error updating mining status to active:', err);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }
        console.log('Mining status set to active for user with ID:', userID);
      });


  
    // Set interval to add $5 to the amount_mined every second for 10 minutes
    const interval = setInterval(() => {
      // Check if 10 minutes have passed
      if (new Date() - startTime >= 1 * 20 * 1000) {
        clearInterval(interval); // Stop the interval
        console.log('Mining completed for user with ID:', userID);
        res.status(200).json({ message: 'Mining completed successfully', userID: userID });
        return;
      }

      
  
      // Update amount_mined in the database
      const sql = 'UPDATE btcminer SET amount_mined = amount_mined + 0.000001 WHERE user_id = ?';
      connection.query(sql, [userID], (err, result) => {
        if (err) {
          console.error('Error updating amount mined:', err);
          clearInterval(interval); // Stop the interval on error
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }
        console.log('$5 added to amount mined for user with ID:', userID);
        // res.status(200).json({ message: 'Mining in profresss' });
        // res.status(200).json({ message: '$5 added to amount mined', userID: userID, amount_mined: result.amount_mined + 5 });
      });
    }, 1000); // Execute every second
  
    console.log('Mining started for user with ID:', userID);
  
    // End mining after 10 minutes
    const startTime = new Date();
    setTimeout(() => {
      clearInterval(interval); // Stop the interval after 10 minutes
      const setInactiveSql = 'UPDATE btcminer SET mining_status = ? WHERE user_id = ?';
      connection.query(setInactiveSql, ['inactive', userID], (err, result) => {
        if (err) {
          console.error('Error updating mining status to inactive:', err);
          return;
        }
        console.log('Mining status set to inactive for user with ID:', userID);
      });
      console.log('Mining completed for user with ID:', userID);
      res.status(200).json({ message: 'Miner complete'});
    }, 1 * 20 * 1000); // 10 minutes in milliseconds
});


// API endpoint to start adding $5 to the amount_mined every second for 10 minutes
app.post('/start-mining2/:userID', (req, res) => {
    const { userID } = req.params;
    const packageCode = req.query.packageCode;

    // Validate package code
    if (packageCode !== "android.kla.js") {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

  
    // Validate userID
    if (!userID) {
      res.status(400).json({ error: 'userID is required' });
      return;
    }
  
    // Set mining_status to active and initialize time_left in the database
    const setActiveSql = 'UPDATE btcminer SET mining_status = ?, time_remaining = ? WHERE user_id = ?';
    const initialTimeLeft = 10 * 60; // 10 minutes in seconds
    connection.query(setActiveSql, ['active', initialTimeLeft, userID], (err, result) => {
      if (err) {
        console.error('Error updating mining status and time left:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }
      console.log('Mining status set to active and time left initialized for user with ID:', userID);
      //res.status(200).json({ message: 'Mining started successfully', userID: userID, timeLeft: initialTimeLeft  });

      const query = `SELECT * FROM btcminer WHERE user_id = '${userID}'`;
       connection.query(query, (err, results) => {
      if (err) {
        console.error('Error querying database: ', err);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
      if (results.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      res.json(results[0]); // Assuming only one user with given userID
    });
      
     
    });
  
    // Set interval to add $5 to the amount_mined every second for 10 minutes
    const interval = setInterval(() => {
      // Update time left in the database
      const updatedTimeLeft = Math.max(0, initialTimeLeft - Math.floor((new Date() - startTime) / 1000));
      const updateTimeLeftSql = 'UPDATE btcminer SET time_remaining = ? WHERE user_id = ?';
      connection.query(updateTimeLeftSql, [updatedTimeLeft, userID], (err, result) => {
        if (err) {
          console.error('Error updating time left:', err);
          clearInterval(interval); // Stop the interval on error
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }
        console.log('Time left updated to', updatedTimeLeft, 'seconds for user with ID:', userID);
      });

  
      // Update amount_mined in the database
      const sql = 'UPDATE btcminer SET amount_mined = amount_mined + 0.00000002 WHERE user_id = ?';
      connection.query(sql, [userID], (err, result) => {
        if (err) {
          console.error('Error updating amount mined:', err);
          clearInterval(interval); // Stop the interval on error
          res.status(500).json({ error: 'Internal Server Error' });
          return;
        }
        const updatedAmount = result.amount_mined + 5;
        console.log('$5 added to amount mined for user with ID:', userID, 'Current amount mined:', updatedAmount);
        // Don't send a response here, as it will be sent again on the next interval
      });
    }, 1000); // Execute every second
  
    console.log('Mining started for user with ID:', userID);
  
    // End mining after 10 minutes
    const startTime = new Date();
    setTimeout(() => {

      console.log('Mining completed for user with ID:', userID);
        // Set mining_status back to inactive in the database
        const setInactiveSql = 'UPDATE btcminer SET mining_status = ?, time_remaining = ? WHERE user_id = ?';
        connection.query(setInactiveSql, ['inactive',0, userID], (err, result) => {
          if (err) {
            console.error('Error updating mining status to inactive:', err);
            return;
          }
          console.log('Mining status set to inactive for user with ID:', userID);
      });

      clearInterval(interval); // Stop the interval after 10 minutes
      console.log('Mining completed for user with ID:', userID);
    //   res.status(200).json({ message: 'Miner complete'});
    }, 10 * 60 * 1000); // 10 minutes in milliseconds
});


// Send General Message/ Onesignal notification
app.post('/send-notification', (req, res) => {
    const { message_title, message_body } = req.body;
    const packageCode = req.query.packageCode;

    // Validate package code
    if (packageCode !== "android.kla.js") {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    // Validate request body
    if (!message_title || !message_body) {
        res.status(400).json({ error: 'message_title and message_body are required' });
        return;
    }

    // Insert notification into the database
    const insertNotificationSQL = 'INSERT INTO message_pact (message_title, message_body) VALUES (?, ?)';
    connection.query(insertNotificationSQL, [message_title, message_body], (err, result) => {
        if (err) {
            console.error('Error inserting notification:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Notification successfully sent
        console.log('Notification sent:', result);
        res.status(200).json({ message: 'Notification sent successfully', notification_id: result.insertId });
    });
});

// Get all notification
app.get('/notifications', (req, res) => {

    const packageCode = req.query.packageCode;

    // Validate package code
    if (packageCode !== "android.kla.js") {
        res.status(403).json({ error: 'Forbidden' });
        return;
    }

    // Fetch all notifications from the database
    const fetchNotificationsSQL = 'SELECT * FROM message_pact';
    connection.query(fetchNotificationsSQL, (err, notifications) => {
        if (err) {
            console.error('Error fetching notifications:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Send the notifications as the response
        res.status(200).json({ notifications });
    });
});


// -------------------------------------------



// -------- Very Important -------------

// Miner Function
const startMining = (userID, timeLeft) => {
  const startTime = new Date();
  const interval = setInterval(() => {
    // Update time left in the database
    const updatedTimeLeft = Math.max(0, timeLeft - Math.floor((new Date() - startTime) / 1000));
    const updateTimeLeftSql = 'UPDATE btcminer SET time_remaining = ? WHERE user_id = ?';
    connection.query(updateTimeLeftSql, [updatedTimeLeft, userID], (err, result) => {
      if (err) {
        console.error('Error updating time left:', err);
        clearInterval(interval); // Stop the interval on error
        return;
      }
      console.log('Time left updated to', updatedTimeLeft, 'seconds for user with ID:', userID);
    });

    // Update amount_mined in the database
    const sql = 'UPDATE btcminer SET amount_mined = amount_mined + 0.00000002 WHERE user_id = ?';
    connection.query(sql, [userID], (err, result) => {
      if (err) {
        console.error('Error updating amount mined:', err);
        clearInterval(interval); // Stop the interval on error
        return;
      }
      console.log('$5 added to amount mined for user with ID:', userID);
    });

    if (updatedTimeLeft <= 0) {
      clearInterval(interval); // Stop the interval when time is up
      console.log('Mining completed for user with ID:', userID);

      // Set mining_status back to inactive in the database
      const setInactiveSql = 'UPDATE btcminer SET mining_status = ?, time_remaining = ? WHERE user_id = ?';
      connection.query(setInactiveSql, ['inactive', 0, userID], (err, result) => {
        if (err) {
          console.error('Error updating mining status to inactive:', err);
          return;
        }
        console.log('Mining status set to inactive for user with ID:', userID);
      });
    }
  }, 1000); // Execute every second
};


// API endpoint to check if the user's mining session is dormant
app.get('/check-mining-status/:userID', (req, res) => {
  const { userID } = req.params;

  // Validate userID
  if (!userID) {
    res.status(400).json({ error: 'userID is required' });
    return;
  }

  // Query the database to get the user's mining status and amount mined
  const query = `SELECT mining_status, amount_mined, time_remaining FROM btcminer WHERE user_id = '${userID}'`;
  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error querying database: ', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    // Check if the user exists
    if (results.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const { mining_status, amount_mined, time_remaining } = results[0];

    // Check if mining is active
    if (mining_status === 'active') {
      // Check if the amount mined has remained the same for 3 seconds
      setTimeout(() => {
        connection.query(query, (err, updatedResults) => {
          if (err) {
            console.error('Error querying database: ', err);
            res.status(500).json({ error: 'Internal server error' });
            return;
          }

          const updatedAmountMined = updatedResults[0].amount_mined;
          if (updatedAmountMined === amount_mined) {
            // Mining is dormant
            console.log('Mining session is dormant. Restarting mining...');
            startMining(userID, time_remaining);
            res.json({ message: 'Mining session was dormant and has been restarted' });
          } else {
            // Mining is active
            res.json({ message: 'Mining session is active' });
          }
        });
      }, 3000); // Check after 3 seconds
    } else {
      // Mining is not active
      res.json({ message: 'Mining session is not active' });
    }
  });
});

// Delete User from database
app.delete('/delete-user/:userID', (req, res) => {
  
  const { userID } = req.params;
  const packageCode = req.query.packageCode;

  // Validate package code
  if (packageCode !== "android.kla.js") {
      res.status(403).json({ error: 'Forbidden' });
      return;
  }



  // Validate userID
  if (!userID) {
    res.status(400).json({ error: 'userID is required' });
    return;
  }

  // Delete the user from the database
  const deleteUserSql = 'DELETE FROM btcminer WHERE user_id = ?';
  connection.query(deleteUserSql, [userID], (err, result) => {
    if (err) {
      console.error('Error deleting user:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.log('User with ID', userID, 'deleted successfully');
    res.status(200).json({ message: 'User deleted successfully', userID: userID });
  });
});

// -------- Very Important -------------


// ------- NOT NEEDED ------------

app.post('/new-mine-log/:userID', (req, res) => {
  const { userID } = req.params;
  const packageCode = req.query.packageCode;

  if (packageCode !== "android.kla.js") {
      res.status(403).json({ error: 'Forbidden' });
      return;
  }

  if (!userID) {
      res.status(400).json({ error: 'userID is required' });
      return;
  }

  const setActiveSql = 'UPDATE btcminer SET mining_status = ?, time_remaining = ? WHERE user_id = ?';
  const initialTimeLeft = 10 * 60; // 10 minutes in seconds
  connection.query(setActiveSql, ['active', initialTimeLeft, userID], (err, result) => {
      if (err) {
          console.error('Error updating mining status and time left:', err);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
      }
      console.log('Mining status set to active and time left initialized for user with ID:', userID);

      const query = `SELECT * FROM btcminer WHERE user_id = ?`;
      connection.query(query, [userID], (err, results) => {
          if (err) {
              console.error('Error querying database: ', err);
              res.status(500).json({ error: 'Internal server error' });
              return;
          }
          if (results.length === 0) {
              res.status(404).json({ error: 'User not found' });
              return;
          }
          res.json(results[0]);
      });
  });

  const startTime = new Date();
  const interval = setInterval(() => {
      const updatedTimeLeft = Math.max(0, initialTimeLeft - Math.floor((new Date() - startTime) / 1000));
      const updateTimeLeftSql = 'UPDATE btcminer SET time_remaining = ? WHERE user_id = ?';
      connection.query(updateTimeLeftSql, [updatedTimeLeft, userID], (err, result) => {
          if (err) {
              console.error('Error updating time left:', err);
              clearInterval(interval);
              res.status(500).json({ error: 'Internal Server Error' });
              return;
          }
          console.log('Time left updated to', updatedTimeLeft, 'seconds for user with ID:', userID);
      });

      const sql = 'UPDATE btcminer SET amount_mined = amount_mined + 0.00000002 WHERE user_id = ?';
      connection.query(sql, [userID], (err, result) => {
          if (err) {
              console.error('Error updating amount mined:', err);
              clearInterval(interval);
              res.status(500).json({ error: 'Internal Server Error' });
              return;
          }
          console.log('Amount mined updated for user with ID:', userID);
      });
  }, 1000);

  setTimeout(() => {
      console.log('Mining completed for user with ID:', userID);
      const setInactiveSql = 'UPDATE btcminer SET mining_status = ?, time_remaining = ? WHERE user_id = ?';
      connection.query(setInactiveSql, ['inactive', 0, userID], (err, result) => {
          if (err) {
              console.error('Error updating mining status to inactive:', err);
              return;
          }
          console.log('Mining status set to inactive for user with ID:', userID);
      });

      const logEarningsSql = `
          INSERT INTO mining_logs (user_id, date, amount_mined)
          SELECT user_id, CURDATE(), SUM(amount_mined)
          FROM btcminer
          WHERE user_id = ?
          ON DUPLICATE KEY UPDATE amount_mined = amount_mined + VALUES(amount_mined)
      `;
      connection.query(logEarningsSql, [userID], (err, result) => {
          if (err) {
              console.error('Error logging earnings:', err);
              return;
          }
          console.log('Daily earnings logged for user with ID:', userID);
      });

      clearInterval(interval);
  }, 10 * 60 * 1000);
});


app.get('/earning-history/:userID', (req, res) => {
  const { userID } = req.params;

  if (!userID) {
      res.status(400).json({ error: 'userID is required' });
      return;
  }

  const query = `
      SELECT date, amount_mined
      FROM mining_logs
      WHERE user_id = ?
      ORDER BY date DESC
  `;
  connection.query(query, [userID], (err, results) => {
      if (err) {
          console.error('Error querying earnings history:', err);
          res.status(500).json({ error: 'Internal Server Error' });
          return;
      }
      res.json(results);
  });
});

// ------- NOT NEEDED ------------




// API endpoint for checking in(Check if user has taken rewar using reward history)
app.post('/checkin3', (req, res) => {
  const { user_id } = req.query;

  // Check if the user exists in the database
  connection.query('SELECT * FROM btcminer WHERE user_id = ?', [user_id], (error, results, fields) => {
    if (error) {
      console.error('Error checking user: ' + error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = results[0];

    // Check if the user has already checked in today
    const today = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
    connection.query('SELECT * FROM checkin_rewards WHERE user_id = ? AND checkin_date = ?', [user_id, today], (checkinError, checkinResults) => {
      if (checkinError) {
        console.error('Error checking check-in history: ' + checkinError);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      if (checkinResults.length > 0) {
        res.status(400).json({ error: 'User has already checked in today' });
        return;
      }

      // Calculate reward based on the day
      const day = user.reward_days + 1; // Start from Day 1
      let reward = 0;
      switch (day) {
        case 1: reward = 4; break;
        case 2: reward = 7; break;
        case 3: reward = 10; break;
        case 4: reward = 12; break;
        case 5: reward = 15; break;
        case 6: reward = 20; break;
        case 7: reward = 25; break;
        default: reward = 0; // No reward beyond Day 7
      }

      // Update user's amount mined
      const newAmountMined = user.amount_mined + reward;
      connection.query('UPDATE btcminer SET amount_mined = ?, reward_days = ?  WHERE user_id = ?', [newAmountMined, day, user_id], (updateError, updateResults) => {
        if (updateError) {
          console.error('Error updating user: ' + updateError);
          res.status(500).json({ error: 'Internal server error' });
          return;
        }

        // Record the reward in the checkin_rewards table
        connection.query('INSERT INTO checkin_rewards (user_id, checkin_date, reward_amount) VALUES (?, ?, ?)', [user_id, today, reward], (insertError, insertResults) => {
          if (insertError) {
            console.error('Error recording reward: ' + insertError);
            res.status(500).json({ error: 'Internal server error' });
            return;
          }
          res.json({ reward });
        });
      });
    });
  });
});

// API endpoint for getting the number of days remaining to claim rewards and their rewards
app.get('/days_remaining', (req, res) => {
  const { user_id } = req.query;

  // Check if the user exists in the database
  connection.query('SELECT * FROM checkin_rewards WHERE user_id = ?', [user_id], (error, results, fields) => {
    if (error) {
      console.error('Error checking user: ' + error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    if (results.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = results[0];

    // Calculate the number of days remaining to claim rewards and their rewards
    const today = new Date();
    const lastCheckinDate = user.checkin_date; // Assuming this field is available in your database
    const oneDayInMilliseconds = 1000 * 60 * 60 * 24;
    const daysSinceLastCheckin = Math.floor((today - lastCheckinDate) / oneDayInMilliseconds);
    const remainingDays = 7 - daysSinceLastCheckin;
    let rewards = [];
    for (let i = 0; i < remainingDays; i++) {
      let day = daysSinceLastCheckin + i + 1;
      let reward = 0;
      switch (day) {
        case 1: reward = 4; break;
        case 2: reward = 7; break;
        case 3: reward = 10; break;
        case 4: reward = 12; break;
        case 5: reward = 15; break;
        case 6: reward = 20; break;
        case 7: reward = 25; break;
      }
      rewards.push({ day, reward });
    }

    res.json({ remainingDays, rewards });
  });
});



// --------------------------------------------

// Start the server
app.listen(port, () => {
  console.log(`Server is listening at http://localhost:${port}`);
});


