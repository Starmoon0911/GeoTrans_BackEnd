import updateEYnewsContent from "../src/actions/EY/getNewscontent";
import fetchEYNews from "../src/actions/EY/getNews";
import connectDatabase from "../src/database/mongodb";
export default async function getEYnews(){
    connectDatabase()
    await fetchEYNews()
    await updateEYnewsContent()
}