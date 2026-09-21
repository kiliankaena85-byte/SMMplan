# Laya 421M ONNX Decision Microservice (:8009)

Микросервис детерминированного принятия решений для ИИ-поддержки платформы OmniSMM 1.0 на CPU.

## 1. Назначение
- **Triage Intent:** классификация намерения клиента (`order_status`, `drop_refill`, `payment_billing`, `link_technical`, `refund_complaint`, `general_faq`).
- **Frustration Level:** уровень раздражения клиента (`0: CALM`, `1: IMPATIENT`, `2: ANGRY`, `3: HOSTILE`).
- **Escalation Probability:** вероятность необходимости вмешательства живого оператора ($P \in [0.0, 1.0]$).

## 2. Модель
- **Репозиторий:** `Mattepiu/laya-onnx` (Hugging Face / Apache 2.0)
- **Формат:** ONNX int8 (~420 МБ)
- **Требования:** ~1 ГБ RAM, 2 vCPU, без GPU
- **Скорость:** ~15–20 мс на CPU

Для загрузки весов модели:
```bash
mkdir -p docker/laya/models
curl -L https://huggingface.co/Mattepiu/laya-onnx/resolve/main/laya_int8.onnx -o docker/laya/models/laya_int8.onnx
```

## 3. Запуск в Docker
```bash
docker build -t smmplan-laya docker/laya
docker run -d -p 8009:8009 --name smmplan-laya smmplan-laya
```
Проверка здоровья:
```bash
curl http://localhost:8009/health
```
