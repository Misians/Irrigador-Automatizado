#include <WiFi.h>          // Biblioteca para conexão Wi-Fi do ESP32
#include <FirebaseESP32.h> // Biblioteca para comunicação com o Firebase Realtime Database
#include "DHT.h"           // Biblioteca para o sensor de Temperatura e Umidade do Ar (DHT11/DHT22)

// ---------------------- Configurações da sua Rede Wi-Fi ----------------------
const char* ssid = "SEU_NOME_DA_REDE_WIFI";       // Substitua pelo nome exato da sua rede Wi-Fi (SSID)
const char* password = "SUA_SENHA_WIFI";         // Substitua pela senha da sua rede Wi-Fi

// ---------------------- Configurações do seu Projeto Firebase ----------------------
// IMPORTANTE: Obtenha estes valores do seu Firebase Console (Configurações do Projeto > Configurações do seu app web)
#define FIREBASE_HOST "irrigador-automatizado-bcceb-default-rtdb.firebaseio.com" // URL do seu Realtime Database
#define FIREBASE_AUTH "8PqCYKsjxTDxaK0yWXodcGQF6QJDWSLnWwBs3DIP" // Sua Auth Key (chave secreta do banco de dados)

// Objetos para interagir com o Firebase
FirebaseData firebaseData; // Usado para operações de leitura e escrita no Firebase
FirebaseJson json;         // Usado para construir objetos JSON complexos para enviar ao Firebase

// ---------------------- Configurações dos Pinos dos Sensores e Atuadores para ESP32 ----------------------

// Sensor DHT (Temperatura e Umidade do Ar)
#define DHTPIN 32        // PINO DIGITAL: Conecte o pino de dados do DHT a um GPIO do ESP32 (ex: GPIO32)
#define DHTTYPE DHT11    // Tipo do sensor DHT: DHT11 ou DHT22 (ajuste conforme o seu sensor)
DHT dht(DHTPIN, DHTTYPE); // Cria um objeto 'dht' para interagir com o sensor DHT

// Pino do relé da bomba de água
#define PIN_RELE 26      // PINO DIGITAL: Conecte o pino de sinal do relé a um GPIO do ESP32 (ex: GPIO26)
// Limites de umidade do solo para o controle automático da bomba (em porcentagem 0-100%)
#define UMIDADE_LIMITE_SOLO_ACIONA 30 // Se a umidade do solo cair ABAIXO deste valor, a bomba LIGA
#define UMIDADE_LIMITE_SOLO_DESACIONA 60 // Se a umidade do solo subir ACIMA deste valor, a bomba DESLIGA

// Sensor de Chuva (Analógico)
// Conecte a um pino ANALÓGICO do ESP32. Pinos ADC comuns no ESP32: GPIO32-39.
#define RAIN_SENSOR_PIN 34 // PINO ANALÓGICO: Exemplo GPIO34 (ADC1_CH6) para sensor de chuva
int thresholdValueRain = 1500; // Valor limite BRUTO (0-4095) para detectar chuva.
                               // Para a maioria dos sensores de chuva analógicos, valores BAIXOS = CHUVA (molhado).
                               // IMPORTANTE: Calibre este valor lendo o sensor seco e molhado para definir o limite.

// Sensor de Umidade do Solo (Analógico)
// Conecte a um pino ANALÓGICO do ESP32.
#define SOIL_MOISTURE_PIN 35 // PINO ANALÓGICO: Exemplo GPIO35 (ADC1_CH7) para sensor de umidade do solo
int soilMoistureRawValue;    // Variável para armazenar o valor bruto da umidade do solo (0-4095)

// ---------------------- Variáveis Globais para Armazenar Dados de Leitura e Estado ----------------------
float soilMoisturePercentage = 0.0; // Umidade do solo em porcentagem (0-100%)
float ambientTemperature = 0.0;     // Temperatura ambiente em Celsius
float airHumidity = 0.0;            // Umidade do ar em porcentagem
int rawRainValue = 0;               // Valor bruto lido do sensor de chuva
bool isRaining = false;             // Estado: verdadeiro se estiver chovendo, falso caso contrário
bool pumpStatus = false;            // Estado: verdadeiro se a bomba estiver ligada, falso caso contrário

// ---------------------- Funções de Callback do Firebase (Para receber comandos do Firebase/Dashboard) ----------------------

// Esta função é chamada automaticamente pelo Firebase SDK quando há uma mudança nos dados
// do caminho que o Firebase.setStream() está escutando (neste caso, "/comandos").
void streamCallback(StreamData &data) {
  Serial.println("------------------------------------");
  Serial.println("Stream Callback do Firebase Recebido:");
  Serial.print("  Caminho: ");
  Serial.println(data.dataPath()); // Caminho do dado que mudou (ex: /comandos/ligarBombaManual)
  Serial.print("  Tipo: ");
  Serial.println(data.dataType()); // Tipo de dado (ex: boolean, int, string)
  Serial.print("  Valor: ");
  Serial.println(data.jsonString()); // Exibe o valor como string JSON (ou use data.boolData(), data.intData() etc.)

  // Exemplo de como o ESP32 pode reagir a comandos enviados do seu dashboard web (via Firebase)
  if (data.dataPath() == "/comandos/ligarBombaManual") {
    // Se o comando for para ligar/desligar a bomba manualmente
    bool commandToTurnOn = data.boolData(); // Obtém o valor booleano do comando (true/false)
    if (commandToTurnOn) {
      Serial.println("Comando do Firebase: Ligar Bomba Manualmente!");
      digitalWrite(PIN_RELE, HIGH); // Liga o relé (e a bomba)
      pumpStatus = true;
    } else {
      Serial.println("Comando do Firebase: Desligar Bomba Manualmente!");
      digitalWrite(PIN_RELE, LOW); // Desliga o relé (e a bomba)
      pumpStatus = false;
    }
    // Opcional: Após executar o comando, você pode "limpar" o comando no Firebase
    // para que ele não seja reprocessado em um reinício ou para indicar que foi recebido.
    // Firebase.setBool(firebaseData, "/comandos/ligarBombaManual", false);
  } else if (data.dataPath() == "/comandos/reiniciarESP") {
    // Se o comando for para reiniciar o ESP32
    Serial.println("Comando do Firebase: Reiniciar ESP!");
    ESP.restart(); // Reinicia o microcontrolador ESP32
  }
  // Você pode adicionar mais blocos 'else if' para outros comandos que o dashboard web possa enviar
  Serial.println("------------------------------------");
}

// Esta função é chamada se o stream do Firebase tiver um timeout (problema de conexão)
void streamTimeoutCallback(bool timeout) {
  if (timeout) {
    Serial.println("Firebase Stream timeout, tentando reconectar...");
  }
}

// ---------------------- Função de Configuração Principal (Executada uma vez no início) ----------------------
void setup() {
  Serial.begin(115200); // Inicializa a comunicação Serial para depuração (Monitor Serial)

  // Configuração do pino do relé da bomba como SAÍDA
  pinMode(PIN_RELE, OUTPUT);
  digitalWrite(PIN_RELE, LOW); // Garante que o relé está desligado no início (bomba inativa)

  // Inicializa o sensor DHT
  dht.begin();
  Serial.println("Sensor DHT inicializado.");

  // ---------------------- Conectar ao Wi-Fi ----------------------
  Serial.print("Conectando-se a ");
  Serial.println(ssid);
  WiFi.begin(ssid, password); // Inicia a conexão Wi-Fi com as credenciais fornecidas
  // Loop para aguardar que o ESP32 se conecte ao Wi-Fi
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000); // Espera 1 segundo
    Serial.print("."); // Imprime um ponto para indicar que está tentando conectar
  }
  Serial.println("\nWiFi Conectado!"); // Nova linha após os pontos de conexão
  Serial.print("Endereço IP: ");
  Serial.println(WiFi.localIP()); // Imprime o endereço IP que o ESP32 recebeu na rede

  // ---------------------- Inicializar o Firebase ----------------------
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH); // Inicia a conexão com o Firebase
  Firebase.reconnectWiFi(true); // Opcional: Ativa a reconexão automática do Wi-Fi pelo Firebase SDK
  // Configura a função de callback para escutar mudanças no nó "/comandos" no Firebase
  Firebase.setStreamCallback(firebaseData, streamCallback);
  Firebase.setStream(firebaseData, "/comandos"); // Define qual caminho no Firebase o ESP32 vai "escutar" para comandos
  Firebase.setOfflineMode(firebaseData, false); // Define se o cliente tenta salvar dados offline e sincronizar depois
  Serial.println("Firebase inicializado.");
}

// ---------------------- Loop Principal (Executada Repetidamente, indefinidamente) ----------------------
void loop() {
  // Lógica para garantir que o Wi-Fi está conectado. Se cair, tenta reconectar.
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi desconectado. Tentando reconectar...");
    delay(1000); // Pequeno atraso antes de tentar novamente
    return;      // Pula o resto do loop e tenta reconectar na próxima iteração
  }

  // Verifica se o Firebase está pronto (conectado e autenticado) para realizar operações
  if (Firebase.ready()) {
    // ---------------------- 1. Leitura dos Sensores ----------------------

    // Lê a umidade e temperatura do ar do sensor DHT
    airHumidity = dht.readHumidity();
    ambientTemperature = dht.readTemperature();
    // Verifica se a leitura do DHT falhou (isnan significa "não é um número", indicando erro)
    if (isnan(airHumidity) || isnan(ambientTemperature)) {
      Serial.println("ERRO: Falha na leitura do sensor DHT! Verifique a fiação.");
    } else {
      Serial.print("Umidade do Ar: "); Serial.print(airHumidity); Serial.println("%");
      Serial.print("Temperatura: "); Serial.print(ambientTemperature); Serial.println("°C");
    }

    // Lê o valor bruto do sensor de chuva (0-4095 no ESP32)
    rawRainValue = analogRead(RAIN_SENSOR_PIN);
    // Determina se está chovendo: se o valor bruto for MENOR que o 'thresholdValueRain', está chovendo.
    // (Valores menores geralmente indicam mais umidade/chuva para sensores de chuva analógicos)
    isRaining = (rawRainValue < thresholdValueRain);
    Serial.print("Sensor de Chuva (Bruto): "); Serial.print(rawRainValue);
    Serial.print(" (Limite: "); Serial.print(thresholdValueRain); Serial.print(") -> ");
    Serial.println(isRaining ? "Está chovendo!" : "Sem chuva.");

    // Lê o valor bruto do sensor de umidade do solo (0-4095 no ESP32)
    soilMoistureRawValue = analogRead(SOIL_MOISTURE_PIN);
    // Mapeia o valor bruto para uma porcentagem de 0 a 100%.
    // - 4095: Valor lido quando o solo está TOTALMENTE SECO (0% umidade)
    // - 0: Valor lido quando o solo está TOTALMENTE MOLHADO (100% umidade)
    // IMPORTANTE: Ajuste o mapeamento (4095, 0, 0, 100) conforme a calibração do SEU sensor de solo.
    umidadeSoloPorcentagem = map(soilMoistureRawValue, 4095, 0, 0, 100);
    Serial.print("Umidade do Solo: "); Serial.print(umidadeSoloPorcentagem); Serial.println(" %");

    // ---------------------- 2. Lógica de Controle do Relé da Bomba ----------------------
    // A bomba LIGA se:
    // - A umidade do solo estiver ABAIXO do limite para ligar (solo seco) E
    // - NÃO estiver chovendo
    if (umidadeSoloPorcentagem < UMIDADE_LIMITE_SOLO_ACIONA && !isRaining) {
      if (!pumpStatus) { // Verifica se a bomba já não está ligada (evita comandos repetidos)
        digitalWrite(PIN_RELE, HIGH); // Ativa o relé (liga a bomba)
        pumpStatus = true; // Atualiza o status da bomba
        Serial.println("STATUS_BOMBA: LIGADA - Solo seco e sem chuva detectada."); // Mensagem no serial
      }
    }
    // A bomba DESLIGA se:
    // - A umidade do solo estiver ACIMA OU IGUAL ao limite para desligar (solo úmido o suficiente) OU
    // - ESTIVER chovendo
    else if (umidadeSoloPorcentagem >= UMIDADE_LIMITE_SOLO_DESACIONA || isRaining) {
      if (pumpStatus) { // Verifica se a bomba já não está desligada (evita comandos repetidos)
        digitalWrite(PIN_RELE, LOW); // Desativa o relé (desliga a bomba)
        pumpStatus = false; // Atualiza o status da bomba
        Serial.println("STATUS_BOMBA: DESLIGADA - Solo úmido ou chovendo."); // Mensagem no serial
      }
    }
    // Imprime o status atual da bomba no Monitor Serial
    if (pumpStatus) { Serial.println("Status da Bomba: LIGADA."); }
    else { Serial.println("Status da Bomba: DESLIGADA."); }

    // ---------------------- 3. Enviar Dados para o Realtime Database do Firebase ----------------------
    json.clear(); // Limpa o objeto JSON para reuso, garantindo que não haja dados antigos
    json.set("umidadeSolo", umidadeSoloPorcentagem); // Adiciona a umidade do solo ao JSON
    json.set("temperaturaAmbiente", ambientTemperature); // Adiciona a temperatura do ar
    json.set("umidadeAr", airHumidity);                 // Adiciona a umidade do ar
    json.set("valorChuvaBruto", rawRainValue);          // Adiciona o valor bruto do sensor de chuva
    json.set("estaChovendo", isRaining);                // Adiciona o status booleano de chuva
    json.set("bombaLigada", pumpStatus);                // Adiciona o status booleano da bomba
    json.set("timestamp", Firebase.getCurrentTimestamp()); // Adiciona um timestamp do Firebase (útil para ordenar dados)

    // Envia o objeto JSON para o Firebase.
    // O pushJSON cria um nó único sob "/leituras" a cada envio, útil para manter um histórico.
    if (Firebase.pushJSON(firebaseData, "/leituras", json)) {
      Serial.println("Dados enviados com sucesso para /leituras no Firebase!");
      // Serial.println("Caminho gerado: " + firebaseData.dataPath()); // Opcional: mostra o caminho completo no Firebase
    } else {
      Serial.print("ERRO ao enviar JSON para Firebase: ");
      Serial.println(firebaseData.errorReason()); // Imprime o motivo do erro de envio
    }

    delay(5000); // Espera 5000 milissegundos (5 segundos) antes da próxima leitura e envio.
                 // Isso define a frequência de atualização dos dados no Firebase.
  } else {
    // Se o Firebase não estiver pronto (ex: problema de conexão Wi-Fi ou autenticação)
    Serial.println("Firebase não está pronto. Verifique a conexão Wi-Fi ou configurações do Firebase.");
    delay(1000); // Pequeno atraso para não lotar o Monitor Serial com mensagens
  }

  delay(100); // Pequeno delay adicional para evitar sobrecarga do loop em geral
}
