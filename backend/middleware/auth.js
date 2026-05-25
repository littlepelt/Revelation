// backend/middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // 1. Получаем заголовок Authorization
    const authHeader = req.headers.authorization;
    console.log("🔐 Middleware: Authorization header received:", authHeader ? "Yes" : "No");

    // 2. Проверяем, что он есть и начинается с "Bearer "
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log("❌ Middleware: No or invalid Authorization header");
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    // 3. Извлекаем сам токен
    const token = authHeader.split(' ')[1];

    try {
        // 4. Верифицируем токен с вашим секретом
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("✅ Middleware: Token verified for user:", decoded.userId);
        
        // 5. Добавляем информацию о пользователе в объект запроса
        req.user = decoded;
        next();
    } catch (err) {
        console.log("❌ Middleware: Invalid token:", err.message);
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};