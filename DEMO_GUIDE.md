# A 90-second Afterlight demo

## Before recording

1. Install Ollama, download `gemma3:1b`, and confirm Ollama is running.
2. Start Afterlight with `python main.py` and open `http://127.0.0.1:8765`.
3. Keep the demo archive fictional. No real family story is needed.

## Walkthrough

**0:00 — Open the room.** Show the dark green archive, the local-model indicator, and the banner that names the starter stories as fictional.

**0:12 — Follow one story.** Open **The glass of water**. Read Rosa's line about leaving a little of everything we love. Point out that the original is preserved exactly as a family note.

**0:28 — Ask a question.** Go to **Ask the archive** and ask: *“What did Elena sing when the rain came?”* Afterlight searches the archive locally, sends only matching stories to Gemma through Ollama on this computer, and shows the sources beside the reflection.

**0:48 — Show the guardrail.** Point at the quote check and the original-story cards. Afterlight will not show a generated quote unless it is present in a source story. It labels the reflection as an interpretation, not Rosa speaking.

**1:02 — Follow the threads.** Open **Threads we keep**. Select **rain**, **radio**, or **marigolds** to trace details through the stories where they appear.

**1:15 — Show ownership.** Add a short fictional memory, then export the JSON archive. Mention that the database is stored in the computer's local app-data folder, outside a project directory that might sync through OneDrive.

## Keep the claims precise

- Say “runs locally after the model is downloaded,” not “needs no internet for setup.”
- Call generated text a reflection, not a recovered memory or a person's voice.
- Say the quote is source-checked; the rest of the reflection still needs a human reader.
- Mention the SQLite file is not encrypted and that consent matters before saving another person's story.
- If Ollama is not running, the app shows an offline index preview and labels it clearly; do not present that preview as model output.
