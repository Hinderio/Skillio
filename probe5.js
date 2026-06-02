async function login(c,e,p){ const fn='signIn'; return c.auth[fn]({email:e,secret:p}); }
