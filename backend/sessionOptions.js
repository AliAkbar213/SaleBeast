function sessionOptions(env = process.env) {
    const isProduction = env.NODE_ENV === "production" || env.RENDER === "true";

    return {
        secret: env.SESSION_SECRET || 'test',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 1000 * 60 * 60 * 60 * 24,
            // Local HTTP needs a non-secure cookie. Hosted cross-site requests
            // need SameSite=None and HTTPS so credentials can be included.
            sameSite: isProduction ? 'none' : 'lax',
            secure: isProduction,
            httpOnly: true,
        },
    };
}

module.exports = sessionOptions;
