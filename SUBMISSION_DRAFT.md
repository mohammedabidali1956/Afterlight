---
title: "Afterlight: An Open-Model Memory Lantern That Never Pretends to Be Your Grandmother"
tags: devchallenge, hf26challenge, opensource, gemma
published: false
---

> A recipe card. A radio that needed two taps. The chair nobody puts away. Sometimes the most honest way to remember a person is to notice what they left in the room.

This is my submission for [Hacktoberfest Open-Source AI Challenge: Week 4 — Ghost in the Machine](https://dev.to/events/82).

## What I built

**Afterlight** is a local-first family memory archive. It keeps stories about a person's recipes, objects, songs, sayings, and everyday rituals together, then uses a locally running open-weight model to notice connections across them.

I built it for one reason: family stories are too intimate to treat as disposable prompt data. The included archive is fictional, so anyone can try the experience without donating a real person's life to a demo.

## The ghost is the thread, not the impersonation

The boundary is part of the interface itself: Afterlight will reflect on memories, but it will never pretend to be the person who died, claim to know what they would say, or write new words in their name.

Ask what Elena sang when the rain came, and Afterlight retrieves the matching original note. An open model can then point out a thread among the saved stories. The sources stay visible. Any quotation is checked against the source text before it can appear. The model's interpretation is labeled as an interpretation, never merged into the archive.

## How it works

```text
Family story → local SQLite archive → local keyword retrieval
                                      ↓
                            Ollama on 127.0.0.1
                                      ↓
                    open model reflection + source cards
```

The app is plain HTML, CSS, and JavaScript backed by Python's standard library. It has no cloud database, account system, analytics, API key, or third-party Python package. The database lives in the operating system's local app-data folder, outside the project directory, and the web server binds to `127.0.0.1`. The user can choose an Ollama model already installed on their computer; Gemma 3 1B is the light starting point.

## Why open innovation matters here

The model is not an optional cloud feature decorating a hosted archive. It is a local tool working beside the family's locally stored records. Once the model is downloaded, the question and retrieval loop can run with the internet disconnected. No subscription decides whether the family can keep asking questions, and a model update cannot overwrite the source stories.

Open weights also let a family pick the model that fits their computer, inspect the prompt, or take AI out of the archive altogether. The stories remain readable JSON on export and remain in SQLite if Ollama is turned off.

## Best Use of Gemma

Gemma 3 is Afterlight's recommended model for the local reflection step: it receives only the retrieved story excerpts and returns a small structured reflection. Before showing the result, the app checks each proposed quotation against the original text. The family can choose another model from Ollama, but the Gemma path is the one this entry is built to demonstrate.

## A note on trust

Local inference does not make a model infallible. A small model may still infer too much, which is why Afterlight shows the original notes next to every reflection and drops any generated quote it cannot find verbatim in the sources. It does not claim to fact-check the full reflection. A family member remains the editor.

The SQLite database is not encrypted, so this prototype is for a trusted personal computer, not a shared public machine. Only add someone else's story with their consent.

## Try it

The repository includes a fictional starter archive and works without a login. To run local inference, install Ollama and run `ollama pull gemma3:1b`, then start the project with `python main.py`. The full setup is in the README.

**Source:** [https://github.com/mohammedabidali1956/Afterlight](https://github.com/mohammedabidali1956/Afterlight)  
**Demo:** [Add a short screen recording or locally hosted demo link before publishing]

---

*The story cards in the starter archive are fictional. No family recording or personal memory was used to create the demo.*
