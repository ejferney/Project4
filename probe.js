import axios from 'axios';

async function test() {
    try {
        console.log("Probing DELETE /commentsOfPhoto/000000000000000000000000/000000000000000000000000");
        await axios.delete('http://localhost:3001/commentsOfPhoto/000000000000000000000000/000000000000000000000000');
    } catch (err) {
        if (err.response) {
            console.log("Status:", err.response.status);
            console.log("Data:", err.response.data);
        } else {
            console.log("Error:", err.message);
        }
    }
}

test();
