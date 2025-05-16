import getEYnews from "../fetch/getEYnews";
import getEducation from "../fetch/getEducation";
import connectDatabase from "../src/database/mongodb";
connectDatabase();
async function run(){
    await getEYnews()
    await getEducation
};
run()