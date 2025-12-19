# ai-builds
Stuff I make using AI Bots


docker build -t ai-stuff:latest --build-arg REACT_APP_GEMINI_API_KEY="" -f client/Dockerfile client
docker run -p 8080:80 --name ai-stuff -d ai-stuff:latest
docker tag ai-stuff:latest saadsaiyed7/ai-stuff:latest
docker push saadsaiyed7/ai-stuff:latest