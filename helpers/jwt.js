// ============================================
// FILE: helpers/jwt.js (UPDATED WITH RBAC)
// ============================================
const { expressjwt: jwt } = require('express-jwt');

function authJwt() {
    const secret = process.env.secret;
    const api = process.env.API_URL;
    
    return jwt({
        secret,
        algorithms: ['HS256']
    }).unless({
        path: [
            // Public routes - no authentication needed
            {url: /\/public\/uploads(.*)/, methods: ['GET', 'OPTIONS']},
            {url: /\/api\/v1\/products(.*)/, methods: ['GET', 'OPTIONS']},
            {url: /\/api\/v1\/categories(.*)/, methods: ['GET', 'OPTIONS']},
            `${api}/users/login`,
            `${api}/users/register`,
        ]
    });
}

module.exports = authJwt;