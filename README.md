<h1 align="center"> <a href="http://chat.firsthomebuyer.help">FHB Assistant</a></h1>
<h4 align="center">A Retrieval Augmented Generation (RAG) based chat assistant for Australian first home buyers</h4>
<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#how-it-works">How it works</a> •
  <a href="#development">Development</a>
</p>

<div align="center">

https://github.com/user-attachments/assets/8f74690f-b256-417d-add6-8b4c354e05e2

</div>

### Overview

FHB Assistant is loaded with up to date, context specific information to provide general guidance on all government schemes, the complexity of australian home loans and the purchasing process involved.

### How it works

FBH Assistant uses retrieval augmented generation (RAG), which is just a fancy term for the manipulation of prompts to provide relevant information to an LLM when a question is asked. An LLM will (hopefully) hallucinate less if the answer to the user's question is presented to it in the same prompt as the question. 

#### Quick overview:

1. Documents containing context relevant information are split into smaller overlapping chunks of text
2. Each chunk is vectorised via an embeddings model which returns an n dimensional vector representing a text chunk's position in space relative to all other chunks containing similar content in meaning 
    - The embeddings for 'boat' and 'sail' would be close together but 'boat' and 'refrigerator' would be further apart.
3. Store the embeddings in a database
4. When a user asks a question, generate an embedding vector for the question text
5. Look up the top x closest text chunks to the question from the database using a distance function e.g. cosine distance
6. Prepend the user's question with the context from the text chunks and send it to an LLM
7. The LLM will answer the question based on the context provided, providing answers based on content from the original documents

#### Refinement

Some intermediate prompt refinement steps used to increase output quality, for example: 
- contextualising a user prompt based on the chat history and, 
- performing multiple LLM passes on the text content to extract only the relevant information.

#### ⚠️ Warning ⚠️ 

There is no guarantee of the correctness of responses because hallucinations are unavoidable!

### Development

1. Copy the .env.example file to .env and fill in the required fields
    ```sh
    cp .env.example .env
    ```
2. Install dependencies and build
    ```sh
    npm i && npm run build
    ```
3. Start the pg-vector docker container, generate and apply a migration
    ```sh
    npm run docker
    npm run db:migrate-generate
    npm run db:migrate-apply
    ```
4. Start the server
    ```sh
    npm run dev
    ```

#### Adding content

1. Edit documents in the [config file](./db/seedDocs/config.ts)
2. Run the document seed script
    ```sh
    npm run seed-content
    ```

### Resources

- [GPT Crawler](https://github.com/BuilderIO/gpt-crawler)
- [Drizzle](https://orm.drizzle.team/docs/overview)
- [PG Vector](https://github.com/pgvector/pgvector)
  - [Drizzle pg-vector extension](https://orm.drizzle.team/docs/extensions/pg#pg_vector)



