# Moira

## Features 

- Integrated Data Model 
    - Each quanta of information can be viewed as different *structures*
        - Tables, Lists, Cyclic Graphs, Trees, Kanban, Code and other custom structures
    - Mix and match *lenses* according to your needs
        - Rose-Tinted, Non-Symbolic, Language, Emoji, Vitality
- Fluid Design System
    - *All* views are adjustible
    - *All* transitions are smoothly animated
- Relations and Transformations over Static State
    - Everything is modelled through relations 
        - Time, Emotions, Entities, Concepts, People, Lists
    - View the flowering of your lifemap over time

## What is this useful for?
As a general principle, this tool is designed to balance thinking with feeling. This is a balance between logic and intuition, deconstructing and viewing the whole, planned and spontaneous, reason and emotion, the mind and the heart.
- Personal Life Organisation

## What is this less useful for?
While these use cases will probably work fine and probably a bit better than other tools, these are not a primary focus.
- Nothing?
## Getting Started 
You'll need the following tools:
- VSCode
- NPM
- Yarn

You'll need the following VSCode extensions:
- Etc
- Etc
- Etc

### 1. Clone this repo
```bash
git clone etc 
```
### 2. Install depdenencies
```bash
yarn install 
```
### 3. Run Lifemap 
```bash
yarn dev-web 
```

```
## Engineering design decisions
- Language
    - While this project uses TypeScript, the way it is written takes some inspiration from Haskell. Namely minimising side effects, pattern matching*, QuickCheck*, strict typing, abstract data types, immutable data, and union types. Exceptions have been made where necessary. For example, graph operations are simpler, clearer and faster when written in an iterative style utilising mutability.
    - While functional languages like ReasonML, and Elixir were considered, they don't interface very elegantly with the vast eco-system of useful JavaScript and React libraries out there.
- Backend and Database
    - The backend has to be simple and real-time. There should be a minimal distinction between backend (which includes the database) and frontend. You should be able to access data from the backend without writing new endpoints or updating the server image. For this reason, Google Firebase Realtime Database was chosen.


