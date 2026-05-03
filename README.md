**EduSong**

EduSong is a web application that transforms educational lesson content into culturally rich, AI-generated songs for primary school children in Sierra Leone and West Africa. Teachers upload lesson documents, and the application produces lyrics (using OpenAI) and full audio tracks (using the Suno AI music API), tailored to West African musical traditions and Sierra Leonean English.

**Link to github repository**

**Requirements**
- Node.js
- A PostgreSQL database (e.g., Neon)
- OpenAI API key
- Suno AI API key
- Publicly accessible callback URL for Suno (e.g., Ngrok for local machine, Railway for deployment)


**Steps to Get Started**

Clone and install:

`git clone https://github.com/your-username/EduSong.git`

`cd EduSong`

`npm install`


Configure environment variables (add your own):

`OPENAI_API_KEY=your-openai-api-key-here`

`VITE_HOST=127.0.0.1`

`SUNO_API_KEY=your-suno-api-key-here`

`SUNO_CALLBACK_URL= https://your-domain.com/api/suno/callback`

`DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require`

`NODE_ENV=production`

