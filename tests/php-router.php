<?php
// Mimics the .htaccess rules for PHP's built-in server in tests.
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (preg_match('#^/api/(.*)$#', $path, $m)) { $_GET['route'] = $m[1]; require __DIR__ . '/../dist/api/index.php'; return true; }
if (preg_match('#^/media/(.+)$#', $path, $m)) { $_GET['media'] = $m[1]; require __DIR__ . '/../dist/api/index.php'; return true; }
return false;
