<?php
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = $_POST;
}

$name = trim($data['name'] ?? '');
$message = trim($data['message'] ?? '');

if ($name === '' || $message === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Naam en bericht zijn verplicht.']);
    exit;
}

$name = substr($name, 0, 80);
$message = substr($message, 0, 2000);

$to = 'info@jannisjuliatrouwen.nl';
$subject = 'Nieuwe persoonlijke reactie';

$smtpHost = 'smtp.strato.com';
$smtpPort = 465;
$smtpSecure = 'ssl';
$smtpUser = 'info@jannisjuliatrouwen.nl';
$smtpPass = 'Keeshond18!';

$from = $smtpUser;
$body = "Naam: {$name}\n\nBericht:\n{$message}\n";

try {
    smtpSend([
        'host' => $smtpHost,
        'port' => $smtpPort,
        'secure' => $smtpSecure,
        'user' => $smtpUser,
        'pass' => $smtpPass
    ], $from, $to, $subject, $body);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Verzenden mislukt.']);
    exit;
}

echo json_encode(['success' => true]);

function smtpSend(array $cfg, $from, $to, $subject, $body) {
    $host = $cfg['host'];
    $port = $cfg['port'];
    $secure = $cfg['secure'];
    $user = $cfg['user'];
    $pass = $cfg['pass'];

    $remote = ($secure === 'ssl') ? 'ssl://' . $host . ':' . $port : $host . ':' . $port;
    $socket = stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT);
    if (!$socket) {
        throw new Exception('SMTP connect failed: ' . $errstr);
    }
    stream_set_timeout($socket, 15);

    smtpExpect($socket, 220);
    smtpCommand($socket, 'EHLO ' . gethostname(), 250);
    smtpCommand($socket, 'AUTH LOGIN', 334);
    smtpCommand($socket, base64_encode($user), 334);
    smtpCommand($socket, base64_encode($pass), 235);
    smtpCommand($socket, 'MAIL FROM: <' . $from . '>', 250);
    smtpCommand($socket, 'RCPT TO: <' . $to . '>', 250);
    smtpCommand($socket, 'DATA', 354);

    $headers = [
        'From: ' . $from,
        'To: ' . $to,
        'Subject: ' . trim(preg_replace('/\r|\n/', '', $subject)),
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8'
    ];

    $message = implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n.";
    fwrite($socket, $message . "\r\n");
    smtpExpect($socket, 250);
    smtpCommand($socket, 'QUIT', 221);
    fclose($socket);
}

function smtpCommand($socket, $command, $expectedCode) {
    fwrite($socket, $command . "\r\n");
    smtpExpect($socket, $expectedCode);
}

function smtpExpect($socket, $expectedCode) {
    $response = '';
    while (!feof($socket)) {
        $line = fgets($socket, 512);
        if ($line === false) break;
        $response .= $line;
        if (isset($line[3]) && $line[3] === ' ') break;
    }
    $code = (int)substr($response, 0, 3);
    if ($code !== (int)$expectedCode) {
        throw new Exception('SMTP error: ' . trim($response));
    }
}
