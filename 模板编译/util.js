function isPlainTextElement(tag){
    let tags = {
        script: true,
        style: true,
        textarea: true
    }
    return tags[tag];
}

module.exports = {
  isPlainTextElement
};