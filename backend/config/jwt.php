<?php

return [
    'secret' => env('JWT_SECRET'),
    'ttl' => (int)env('JWT_TTL', 10080), // Cast to integer explicitly
    'refresh_ttl' => 20160,
    'algo' => 'HS256',
    'required_claims' => ['iss', 'iat', 'exp', 'nbf', 'sub', 'jti'],
    'blacklist_enabled' => true,
    'blacklist_grace_period' => 30,
    'providers' => [
        'jwt' => Tymon\JWTAuth\Providers\JWT\Lcobucci::class,
        'auth' => Tymon\JWTAuth\Providers\Auth\Illuminate::class,
        'storage' => Tymon\JWTAuth\Providers\Storage\Illuminate::class,
    ],
];
