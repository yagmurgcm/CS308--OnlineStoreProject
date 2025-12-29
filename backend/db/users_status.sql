SELECT 
  u.id,
  u.name AS username,
  u.email,
  CONCAT(LEFT(u.password, 10), '...') AS password_hash,
  DATE_FORMAT(u.createdAt, '%Y-%m-%d %H:%i') AS registration_time,
  DATE_FORMAT(MAX(l.loginTime), '%Y-%m-%d %H:%i') AS last_login_time,
  DATE_FORMAT(MAX(l.logoutTime), '%Y-%m-%d %H:%i') AS last_logout_time,
  CASE
    WHEN MAX(l.loginTime) IS NULL THEN '⚫ Never logged in'
    WHEN MAX(l.logoutTime) IS NULL OR MAX(l.logoutTime) < MAX(l.loginTime)
      THEN '🟢 Active'
    ELSE '🔴 Logged out'
  END AS current_status
FROM user u
LEFT JOIN login_log l ON u.id = l.userId
GROUP BY u.id, u.name, u.email, u.password, u.createdAt
ORDER BY last_login_time DESC;
