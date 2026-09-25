<?php
/* EPIC DEVICES store API for standard (Apache + PHP) hosting.
   The same endpoints as server.js, for when the site is published as static files instead
   of running the Node.js app, so checkout still saves real orders that the console shows:
     GET  /api/health     GET/PUT /api/state     POST /api/login
     POST/GET/PUT /api/orders     GET /api/track?id=     GET /api/photos     GET /media/<file>
   .htaccess sends /api/* and /media/* here. Data lives outside the website folder, in
   EPIC_DATA_DIR or ~/epic-data (the folder server.js uses), so a redeploy never touches it.
   Console sign-in: username "admin" (or EPIC_ADMIN_USER) and the password in the
   EPIC_ADMIN_PASSWORD environment variable or, on hosting without environment variables,
   the first line of ~/epic-data/admin-password.txt (create it in the File Manager). */

declare(strict_types=1);
header('X-Content-Type-Options: nosniff');

final class HttpError extends Exception {
  public int $status;
  public function __construct(int $status, string $message) { parent::__construct($message); $this->status = $status; }
}

/* Where the shop's data folder can be. Hostinger accounts differ (home folder, domains/,
   public_html), so every usual place is considered; the first that already holds the shop's
   data or the password file wins, otherwise the home folder is used. */
function candidate_dirs(): array {
  $list = [];
  if ($env = getenv('EPIC_DATA_DIR')) $list[] = $env;
  if (preg_match('#^(/home/[^/]+)#', __DIR__, $m)) $list[] = $m[1] . '/epic-data';
  if ($home = getenv('HOME')) $list[] = rtrim($home, '/') . '/epic-data';
  if (function_exists('posix_getpwuid')) { $pw = posix_getpwuid(posix_geteuid()); if (!empty($pw['dir'])) $list[] = rtrim($pw['dir'], '/') . '/epic-data'; }
  $site = dirname(__DIR__);                                  // the published website folder
  $list[] = dirname($site) . '/epic-data';                   // next to public_html
  if (preg_match('#^(/home/[^/]+/domains/[^/]+)#', __DIR__, $m)) $list[] = $m[1] . '/epic-data';
  if (preg_match('#^(/home/[^/]+)#', __DIR__, $m)) $list[] = $m[1] . '/domains/epic-data';
  $list[] = $site . '/epic-data';                            // inside the website (blocked from the web by .htaccess)
  $list[] = dirname((string)($_SERVER['DOCUMENT_ROOT'] ?? $site)) . '/epic-data';
  return array_values(array_unique(array_map(fn($d) => rtrim($d, '/'), $list)));
}
function password_file(string $dir): ?string {
  foreach (['admin-password.txt', 'admin-password.txt.txt', 'admin-password', 'Admin-password.txt', 'admin password.txt'] as $name)
    if (is_file("$dir/$name") && is_readable("$dir/$name")) return "$dir/$name";
  return null;
}
function data_dir(): string {
  $dirs = candidate_dirs();
  foreach ($dirs as $d) if (password_file($d) || is_file("$d/orders.json") || is_file("$d/state.json")) return $d;
  foreach ($dirs as $d) if (is_dir($d) && is_writable($d)) return $d;
  foreach ($dirs as $d) if (@mkdir($d, 0700, true) || is_dir($d)) return $d;
  return $dirs[0];
}
$DATA = data_dir();

function read_json(string $name, $fallback) {
  global $DATA;
  $file = "$DATA/$name";
  if (!is_file($file)) return $fallback;
  $value = json_decode((string)file_get_contents($file), true);
  return $value === null ? $fallback : $value;
}
function write_json(string $name, $value): void {
  global $DATA;
  $tmp = "$DATA/$name." . bin2hex(random_bytes(4)) . '.tmp';
  file_put_contents($tmp, json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
  rename($tmp, "$DATA/$name");
}
/* one writer at a time, like server.js's queue */
function with_lock(callable $fn) {
  global $DATA;
  $h = fopen("$DATA/.lock", 'c');
  flock($h, LOCK_EX);
  try { return $fn(); } finally { flock($h, LOCK_UN); fclose($h); }
}
function send(int $status, $data): void {
  http_response_code($status);
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
  exit;
}
function body(int $max): array {
  $raw = (string)file_get_contents('php://input', false, null, 0, $max + 1);
  if (strlen($raw) > $max) throw new HttpError(413, 'That request is too large.');
  if ($raw === '') return [];
  $v = json_decode($raw, true);
  if (!is_array($v)) throw new HttpError(400, 'The request could not be read.');
  return $v;
}
function clean($v, int $max): string {
  $s = preg_replace('/[\x00-\x1f\x7f]/u', ' ', (string)($v ?? ''));
  return mb_substr(trim((string)$s), 0, $max);
}
function ip(): string { return trim(explode(',', (string)($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? ''))[0]); }
function limit(string $key, int $max, int $windowMs): void {
  with_lock(function () use ($key, $max, $windowMs) {
    $hits = read_json('rate-limits.json', []);
    $now = (int)(microtime(true) * 1000);
    $list = array_values(array_filter($hits[$key] ?? [], fn($t) => $now - $t < $windowMs));
    if (count($list) >= $max) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');
    $list[] = $now; $hits[$key] = $list;
    if (count($hits) > 2000) $hits = [$key => $list];
    write_json('rate-limits.json', $hits);
  });
}

/* sessions: a signed, expiring token */
function secret(): string {
  global $DATA;
  $file = "$DATA/secret.key";
  if (is_file($file)) return trim((string)file_get_contents($file));
  $s = bin2hex(random_bytes(32));
  file_put_contents($file, $s); @chmod($file, 0600);
  return $s;
}
function b64u(string $s): string { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function sign_token(array $payload): string { $body = b64u(json_encode($payload)); return $body . '.' . b64u(hash_hmac('sha256', $body, secret(), true)); }
function verify_token(string $token): bool {
  $parts = explode('.', $token);
  if (count($parts) !== 2) return false;
  if (!hash_equals(b64u(hash_hmac('sha256', $parts[0], secret(), true)), $parts[1])) return false;
  $data = json_decode((string)base64_decode(strtr($parts[0], '-_', '+/')), true);
  return is_array($data) && ($data['exp'] ?? 0) > microtime(true) * 1000;
}
function token_data(string $token): ?array {
  if (!verify_token($token)) return null;
  return json_decode((string)base64_decode(strtr(explode('.', $token)[0], '-_', '+/')), true);
}
/* Console users: the owner signs in with the password file (full access); staff users live in
   users.json with a salted PBKDF2 hash (the same format server.js uses) and a list of sections. */
function access_rules(): array {
  static $rules = null;
  if ($rules === null) $rules = json_decode((string)@file_get_contents(__DIR__ . '/access.json'), true) ?: ['sections' => [], 'readOrders' => [], 'writeOrders' => [], 'writeState' => [], 'media' => []];
  return $rules;
}
function owner_name(): string { return strtolower(trim((string)(getenv('EPIC_ADMIN_USER') ?: 'admin'))); }
function hash_password(string $password): string {
  $salt = random_bytes(16);
  return 'pbkdf2_sha256$150000$' . base64_encode($salt) . '$' . base64_encode(hash_pbkdf2('sha256', $password, $salt, 150000, 32, true));
}
function check_password(string $password, string $stored): bool {
  $parts = explode('$', $stored);
  if (count($parts) !== 4 || $parts[0] !== 'pbkdf2_sha256') return false;
  return hash_equals((string)base64_decode($parts[3]), hash_pbkdf2('sha256', $password, (string)base64_decode($parts[2]), (int)$parts[1], 32, true));
}
function public_user(array $u): array { unset($u['hash']); return $u; }
function principal_for(?array $data): array {
  if (!$data) throw new HttpError(401, 'Please sign in again.');
  $sections = access_rules()['sections'];
  if (empty($data['uid'])) return ['username' => owner_name(), 'name' => 'Owner', 'owner' => true, 'admin' => true, 'access' => $sections];
  foreach (read_json('users.json', []) as $u) if (($u['id'] ?? '') === $data['uid']) {
    if (empty($u['active'])) break;
    $out = public_user($u); $out['owner'] = false;
    $out['access'] = !empty($u['admin']) ? $sections : array_values(array_intersect($u['access'] ?? [], $sections));
    return $out;
  }
  throw new HttpError(401, 'Your account is no longer active. Ask the store owner.');
}
function principal(): array {
  $auth = (string)($_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
  return principal_for(token_data(preg_replace('/^Bearer\s+/i', '', $auth)));
}
function can(array $who, array $sections): bool { return !empty($who['admin']) || (bool)array_intersect($sections, $who['access'] ?? []); }
function require_access(array $sections): array {
  $who = principal();
  if (!can($who, $sections)) throw new HttpError(403, "Your account doesn't have access to that. Ask the store owner.");
  return $who;
}
function clean_user(array $b): array {
  return ['name' => clean($b['name'] ?? '', 60), 'username' => preg_replace('/[^a-z0-9._-]/', '', strtolower(clean($b['username'] ?? '', 40))),
    'admin' => !empty($b['admin']), 'active' => ($b['active'] ?? true) !== false,
    'access' => array_values(array_intersect(is_array($b['access'] ?? null) ? $b['access'] : [], access_rules()['sections']))];
}
function admin_password(): string {
  global $DATA;
  $p = (string)getenv('EPIC_ADMIN_PASSWORD');
  if ($p === '' && ($file = password_file($DATA))) {
    $text = preg_replace('/^\xEF\xBB\xBF/', '', (string)file_get_contents($file));   // editors may add a byte-order mark
    $p = trim((string)strtok($text, "\r\n"));
  }
  return $p;
}

/* console photo uploads arrive as data URLs; keep them as files */
function save_media($value) {
  global $DATA;
  if (is_string($value)) {
    if (strlen($value) < 256 || !preg_match('#^data:image/(png|jpe?g|webp|gif|avif);base64,([A-Za-z0-9+/=\s]+)$#', $value, $m)) return $value;
    $buffer = base64_decode(preg_replace('/\s+/', '', $m[2]));
    $name = substr(sha1($buffer), 0, 16) . '.' . ($m[1] === 'jpeg' ? 'jpg' : $m[1]);
    if (!is_dir("$DATA/media")) mkdir("$DATA/media", 0755, true);
    if (!is_file("$DATA/media/$name")) file_put_contents("$DATA/media/$name", $buffer);
    return './media/' . $name;
  }
  if (is_array($value)) { foreach ($value as $k => $v) $value[$k] = save_media($v); }
  return $value;
}

function new_order_id(array $orders): string {
  $chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  $taken = array_flip(array_map(fn($o) => $o['id'] ?? '', $orders));
  do { $id = 'ED-'; for ($i = 0; $i < 6; $i++) $id .= $chars[random_int(0, strlen($chars) - 1)]; } while (isset($taken[$id]));
  return $id;
}
function money_num($v): float { return is_numeric($v) && (float)$v >= 0 ? round((float)$v, 2) : 0.0; }

function create_order(array $b): array {
  limit('order:' . ip(), 6, 10 * 60 * 1000);
  if (!empty($b['website'])) throw new HttpError(400, 'Order rejected.');
  $c = is_array($b['customer'] ?? null) ? $b['customer'] : [];
  $customer = ['name' => clean($c['name'] ?? '', 80), 'email' => strtolower(clean($c['email'] ?? '', 120)), 'phone' => clean($c['phone'] ?? '', 30), 'city' => clean($c['city'] ?? '', 60), 'address' => clean($c['address'] ?? '', 300)];
  if ($customer['name'] === '') throw new HttpError(400, 'Add your name to continue.');
  if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $customer['email'])) throw new HttpError(400, 'Enter a valid email address.');
  if (strlen(preg_replace('/\D/', '', $customer['phone'])) < 10) throw new HttpError(400, 'That phone number looks too short.');
  if ($customer['city'] === '') throw new HttpError(400, 'Choose your city.');
  if (mb_strlen($customer['address']) < 5) throw new HttpError(400, 'Add your delivery address.');
  $raw = array_slice(is_array($b['lines'] ?? null) ? $b['lines'] : [], 0, 50);
  if (!$raw) throw new HttpError(400, 'Your bag is empty.');
  $catalog = json_decode((string)@file_get_contents(__DIR__ . '/catalog.json'), true) ?: [];
  return with_lock(function () use ($b, $customer, $raw, $catalog) {
    $state = read_json('state.json', []);
    $stored = [];
    foreach (($state['products'] ?? []) as $p) if (isset($p['id'])) $stored[$p['id']] = $p;
    $review = false; $lines = [];
    foreach ($raw as $l) {
      $id = clean($l['id'] ?? '', 80);
      $qty = max(1, min(99, (int)($l['qty'] ?? 0)));
      $known = $stored[$id] ?? (isset($catalog[$id]) ? ['price' => $catalog[$id]] : null);
      if (!$known) throw new HttpError(400, 'An item in your bag is no longer available. Please refresh the page.');
      $listed = (float)($known['price'] ?? 0); $price = $l['price'] ?? null;
      $unit = is_numeric($price) && (float)$price > 0 ? (float)$price : $listed;
      if ($listed > 0 && abs($unit - $listed) / $listed > 0.3) $review = true;
      $lines[] = ['id' => $id, 'qty' => $qty, 'price' => round($unit, 2), 'cost' => (float)($stored[$id]['cost'] ?? 0)];
    }
    $subtotal = round(array_sum(array_map(fn($l) => $l['price'] * $l['qty'], $lines)), 2);
    $shipping = money_num($b['shipping'] ?? 0); $tax = money_num($b['tax'] ?? 0); $discount = money_num($b['discount'] ?? 0);
    $expected = round($subtotal + $shipping + $tax - $discount, 2);
    $total = abs(money_num($b['total'] ?? 0) - $expected) <= 1 ? money_num($b['total'] ?? 0) : $expected;
    $orders = read_json('orders.json', []);
    $order = [
      'id' => new_order_id($orders), 'createdAt' => (int)(microtime(true) * 1000), 'customer' => $customer,
      'zoneId' => clean($b['zoneId'] ?? '', 20), 'methodId' => clean($b['methodId'] ?? '', 40), 'paymentMethod' => clean($b['paymentMethod'] ?? '', 40) ?: 'cod',
      'lines' => $lines, 'subtotal' => $subtotal, 'weight' => money_num($b['weight'] ?? 0), 'shipping' => $shipping, 'shipCost' => money_num($b['shipCost'] ?? 0),
      'tax' => $tax, 'total' => $total, 'discount' => $discount, 'promoCode' => !empty($b['promoCode']) ? clean($b['promoCode'], 40) : null,
      'etaMin' => money_num($b['etaMin'] ?? 0), 'etaMax' => money_num($b['etaMax'] ?? 0), 'status' => 'Processing', 'paid' => false,
      'note' => 'Placed on the website' . ($review ? '. Prices differ from the catalogue, please check before confirming.' : ''),
      'codPaid' => 0, 'freightPaid' => 0, 'serials' => [], 'channel' => 'website',
    ];
    array_unshift($orders, $order);
    write_json('orders.json', $orders);
    write_json('orders-backup-' . gmdate('Y-m-d') . '.json', $orders);
    if (isset($state['products'])) {
      foreach ($state['products'] as &$p) foreach ($lines as $l) if (($p['id'] ?? '') === $l['id'] && is_numeric($p['stock'] ?? null)) $p['stock'] = max(0, $p['stock'] - $l['qty']);
      unset($p);
      write_json('state.json', $state);
    }
    return $order;
  });
}

const STATE_KEYS = ['products', 'categories', 'promos', 'config'];

try {
  /* /media/<file>: photos saved by the console or fetched for products */
  if (isset($_GET['media'])) {
    $rel = str_replace('\\', '/', (string)$_GET['media']);
    $base = realpath("$DATA/media");
    $file = $base ? realpath("$base/$rel") : false;
    if (!$file || strpos($file, $base . DIRECTORY_SEPARATOR) !== 0 || !is_file($file)) throw new HttpError(404, 'Not found.');
    $types = ['webp' => 'image/webp', 'png' => 'image/png', 'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'avif' => 'image/avif'];
    header('Content-Type: ' . ($types[strtolower(pathinfo($file, PATHINFO_EXTENSION))] ?? 'application/octet-stream'));
    header('Cache-Control: public, max-age=31536000, immutable');
    readfile($file);
    exit;
  }

  $route = trim((string)($_GET['route'] ?? preg_replace('#^.*/api/#', '', (string)parse_url((string)($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH))), '/');
  $m = $_SERVER['REQUEST_METHOD'] ?? 'GET';

  if ($route === 'health' && $m === 'GET') {
    $ready = admin_password() !== '';
    $out = ['ok' => true, 'admin' => $ready, 'time' => (int)(microtime(true) * 1000), 'backend' => 'php'];
    /* until sign-in works, say exactly where the password file is expected */
    if (!$ready) $out['setup'] = ['passwordFile' => "$DATA/admin-password.txt", 'dataFolderExists' => is_dir($DATA), 'dataFolderWritable' => is_dir($DATA) && is_writable($DATA),
      'alsoChecked' => array_values(array_filter(candidate_dirs(), fn($d) => $d !== $DATA))];
    send(200, $out);
  }
  if ($route === 'photos' && $m === 'GET') {
    $out = [];
    foreach (read_json('photos.json', []) as $id => $e) if (!empty($e['file']) && is_file("$DATA/media/products/{$e['file']}")) $out[$id] = './media/products/' . $e['file'];
    send(200, ['photos' => (object)$out]);
  }
  if ($route === 'state' && $m === 'GET') {
    $state = read_json('state.json', []); $out = [];
    foreach (STATE_KEYS as $k) if (array_key_exists($k, $state)) $out[$k] = $state[$k];
    send(200, (object)$out);
  }
  if ($route === 'state' && $m === 'PUT') {
    $who = principal();
    $b = body(40 * 1024 * 1024);
    $saved = with_lock(function () use ($b, $who) {
      $state = read_json('state.json', []); $out = [];
      /* each part is saved only by someone whose sections cover it */
      foreach (STATE_KEYS as $k) if (array_key_exists($k, $b) && can($who, access_rules()['writeState'][$k] ?? [])) { $state[$k] = save_media($b[$k]); $out[$k] = $state[$k]; }
      $state['updatedAt'] = (int)(microtime(true) * 1000);
      write_json('state.json', $state);
      return $out;
    });
    send(200, ['ok' => true, 'saved' => (object)$saved]);
  }
  if ($route === 'login' && $m === 'POST') {
    limit('login:' . ip(), 10, 15 * 60 * 1000);
    $b = body(10 * 1024);
    $name = strtolower(trim((string)($b['user'] ?? ''))); $password = (string)($b['password'] ?? '');
    $expires = (int)(microtime(true) * 1000) + 12 * 60 * 60 * 1000;
    if (hash_equals(hash('sha256', owner_name()), hash('sha256', $name))) {
      $owner = admin_password();
      if ($owner === '') throw new HttpError(503, "Console sign-in is not set up yet. Create the file $DATA/admin-password.txt with your password on the first line (Hostinger File Manager).");
      if (!hash_equals(hash('sha256', $owner), hash('sha256', $password))) throw new HttpError(401, "That username and password don't match.");
      $data = ['u' => owner_name(), 'exp' => $expires];
    } else {
      $found = null;
      foreach (read_json('users.json', []) as $u) if (($u['username'] ?? '') === $name) $found = $u;
      if (!$found || empty($found['active']) || !check_password($password, (string)($found['hash'] ?? ''))) throw new HttpError(401, "That username and password don't match.");
      $data = ['u' => $found['username'], 'uid' => $found['id'], 'exp' => $expires];
    }
    send(200, ['token' => sign_token($data), 'expires' => $expires, 'me' => principal_for($data)]);
  }
  if ($route === 'me' && $m === 'GET') send(200, ['me' => principal()]);
  if ($route === 'me/password' && $m === 'POST') {
    $who = principal();
    if (!empty($who['owner'])) throw new HttpError(400, "The owner's password lives in admin-password.txt. Change it there.");
    $b = body(10 * 1024);
    if (strlen((string)($b['next'] ?? '')) < 8) throw new HttpError(400, 'Use a password of at least 8 characters.');
    with_lock(function () use ($who, $b) {
      $list = read_json('users.json', []);
      foreach ($list as &$u) if (($u['id'] ?? '') === $who['id']) {
        if (!check_password((string)($b['current'] ?? ''), (string)$u['hash'])) throw new HttpError(400, 'Your current password is not right.');
        $u['hash'] = hash_password((string)$b['next']); $u['updatedAt'] = (int)(microtime(true) * 1000);
      }
      unset($u);
      write_json('users.json', $list);
    });
    send(200, ['ok' => true]);
  }
  if ($route === 'users') {
    $who = principal();
    if (empty($who['admin'])) throw new HttpError(403, 'Only the owner and admins can manage users.');
    if ($m === 'GET') send(200, ['users' => array_map('public_user', read_json('users.json', [])), 'owner' => owner_name()]);
    $b = $m === 'DELETE' ? [] : body(20 * 1024);
    $list = with_lock(function () use ($m, $b, $who) {
      $list = read_json('users.json', []);
      $taken = fn($name, $except = null) => $name === owner_name() || (bool)array_filter($list, fn($x) => $x['username'] === $name && $x['id'] !== $except);
      if ($m === 'POST') {
        $u = clean_user($b);
        if ($u['username'] === '' || $u['name'] === '') throw new HttpError(400, 'Add a name and a username.');
        if ($taken($u['username'])) throw new HttpError(400, 'That username is already taken.');
        if (strlen((string)($b['password'] ?? '')) < 8) throw new HttpError(400, 'Use a password of at least 8 characters.');
        $list[] = ['id' => 'U' . bin2hex(random_bytes(5))] + $u + ['hash' => hash_password((string)$b['password']), 'createdAt' => (int)(microtime(true) * 1000), 'createdBy' => $who['username']];
      } elseif ($m === 'PUT') {
        $i = null;
        foreach ($list as $k => $x) if ($x['id'] === ($b['id'] ?? null)) $i = $k;
        if ($i === null) throw new HttpError(404, 'That user no longer exists.');
        $u = clean_user(array_merge($list[$i], $b));
        if ($taken($u['username'], $list[$i]['id'])) throw new HttpError(400, 'That username is already taken.');
        if (isset($b['password']) && $b['password'] !== '') {
          if (strlen((string)$b['password']) < 8) throw new HttpError(400, 'Use a password of at least 8 characters.');
          $list[$i]['hash'] = hash_password((string)$b['password']);
        }
        $list[$i] = array_merge($list[$i], $u, ['updatedAt' => (int)(microtime(true) * 1000)]);
      } elseif ($m === 'DELETE') {
        $before = count($list);
        $list = array_values(array_filter($list, fn($x) => $x['id'] !== ($_GET['id'] ?? '')));
        if (count($list) === $before) throw new HttpError(404, 'That user no longer exists.');
      } else throw new HttpError(405, 'Method not allowed.');
      write_json('users.json', $list);
      return $list;
    });
    send(200, ['users' => array_map('public_user', $list)]);
  }
  if ($route === 'orders' && $m === 'POST') send(201, ['order' => create_order(body(200 * 1024))]);
  if ($route === 'orders' && $m === 'GET') { require_access(access_rules()['readOrders']); send(200, ['orders' => read_json('orders.json', [])]); }
  if ($route === 'orders' && $m === 'PUT') {
    require_access(access_rules()['writeOrders']);
    $b = body(20 * 1024 * 1024);
    $changes = array_values(array_filter(is_array($b['orders'] ?? null) ? $b['orders'] : [], fn($o) => is_array($o) && is_string($o['id'] ?? null)));
    $count = with_lock(function () use ($changes) {
      $orders = read_json('orders.json', []);
      $index = [];
      foreach ($orders as $i => $o) $index[$o['id']] = $i;
      foreach ($changes as $o) { if (isset($index[$o['id']])) $orders[$index[$o['id']]] = $o; else array_unshift($orders, $o); }
      write_json('orders.json', $orders);
      return count($changes);
    });
    send(200, ['ok' => true, 'count' => $count]);
  }
  if ($route === 'track' && $m === 'GET') {
    $id = strtoupper(clean($_GET['id'] ?? '', 20));
    foreach (read_json('orders.json', []) as $o) {
      if (strtoupper((string)$o['id']) !== $id) continue;
      $c = $o['customer'] ?? [];
      unset($o['serials'], $o['note']);
      $o['lines'] = array_map(function ($l) { unset($l['cost']); return $l; }, $o['lines'] ?? []);
      $o['customer'] = ['name' => explode(' ', (string)($c['name'] ?? ''))[0], 'city' => $c['city'] ?? '', 'address' => '', 'email' => '', 'phone' => ''];
      send(200, ['order' => $o]);
    }
    throw new HttpError(404, 'No order found with that number.');
  }
  throw new HttpError(404, 'Not found.');
} catch (HttpError $e) {
  send($e->status, ['error' => $e->getMessage()]);
} catch (Throwable $e) {
  error_log('EPIC API: ' . $e->getMessage());
  send(500, ['error' => 'Something went wrong on our side. Please try again.']);
}
