<?php
// =====================================================
// private-message.php
// Dit script ontvangt een POST met name + message en
// stuurt die via SMTP door naar de trouwemail.
// Antwoord is altijd JSON (success/failure).
// =====================================================
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed.']);
    exit;
}

// 1) Input lezen
// - 'php://input' is handig wanneer JSON in body komt vanaf JS fetch.
// - We proberen JSON te decoderen naar array.
// - Als het geen JSON is (lege body of form-data), gebruiken we $_POST.
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
    $data = $_POST;
}

// 2) Velden schoonmaken
$name = trim($data['name'] ?? '');
$message = trim($data['message'] ?? '');

// 3) Verplicht veld controle
if ($name === '' || $message === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Naam en bericht zijn verplicht.']);
    exit;
}

// 4) Lengtebeperkingen toepassen om misbruik (extreem lange tekst) te blokkeren
$name = substr($name, 0, 80);
$message = substr($message, 0, 2000);

// 5) Ontvanger + onderwerp fix
$to = 'info@jannisjuliatrouwen.nl';
$subject = 'Nieuwe persoonlijke reactie';

// 6) SMTP-configuratie (hardcoded in script, beter via environment variabelen)
$smtpHost = 'smtp.strato.com';
$smtpPort = 465;
$smtpSecure = 'ssl';
$smtpUser = 'info@jannisjuliatrouwen.nl';
$smtpPass = 'Keeshond18!';

$from = $smtpUser;
$body = "Naam: {$name}\n\nBericht:\n{$message}\n";

// 7) Mail versturen en foutafhandeling
try {
    smtpSend([
        'host' => $smtpHost,
        'port' => $smtpPort,
        'secure' => $smtpSecure,
        'user' => $smtpUser,
        'pass' => $smtpPass
    ], $from, $to, $subject, $body);
} catch (Exception $e) {
    // Bij fout blijven we consistent met JSON response
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Verzenden mislukt.']);
    exit;
}

// 8) Succes reactie
echo json_encode(['success' => true]);

// ===== SMTP helpers =====
// smtpSend: bouwt SMTP-verbinding op en verstuurt maildirect via socket
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
    // Stuur 1 SMTP-commando en controleer de resposta code
    fwrite($socket, $command . "\r\n");
    smtpExpect($socket, $expectedCode);
}

function smtpExpect($socket, $expectedCode) {
    // Lees serverrespons regel voor regel tot een afgeronde code-lijn

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
