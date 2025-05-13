<?php

// Enable CORS (Cross-Origin Resource Sharing) for requests from http://127.0.0.1:5500
    header("Access-Control-Allow-Origin: http://127.0.0.1:5500");
    header("Access-Control-Allow-Methods: GET, POST, OPTIONS"); // Allow POST method
    header("Access-Control-Allow-Headers: Content-Type");
    header("Access-Control-Allow-Credentials: true");

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true);

        // Check if data was successfully decoded
        if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
            // Send a 500 Internal Server Error if JSON is invalid
            http_response_code(500);
            echo json_encode(['error' => 'Invalid JSON']);
        } else {

          // Extract data from post body.


          $LASTFETCHEDINDEX = $data['LASTFETCHEDINDEX'];
          $MAXEVENTSTOFETCH = $data['MAXEVENTSTOFETCH'];
          $SELECTEDLANGUAGE = $data['SELECTEDLANGUAGE'];

          $json_data_path = "./events.json";
          if ($SELECTEDLANGUAGE == 'GUJARATI') $json_data_path = './eventsGuj.json';

          $json_data = file_get_contents($json_data_path);
          $events = json_decode($json_data, true);

          if ($LASTFETCHEDINDEX === count($events)) {

            http_response_code(200);
            
            echo json_encode(['LASTFETCHEDINDEX' => $LASTFETCHEDINDEX, 'events' => []]);

            return;
          }

          $events = array_slice($events, $LASTFETCHEDINDEX, $MAXEVENTSTOFETCH);

          $LASTFETCHEDINDEX += count($events);

            // Send a 200 OK response with the received data (or a success message)
            http_response_code(200);
            echo json_encode(['events' => $events]);

        }

    }
?>