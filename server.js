const express = require('express')
const app = express()
const port = process.env.PORT || 5000

app.get('/', (req, res) => res.send('Api Running'))
app.listen(port, () => console.log(`Server app listening on port ${port}!`))