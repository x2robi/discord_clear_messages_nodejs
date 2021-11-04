const request = require("request");

class ClearMessagesManager {
    #_authToken;
    authorId;

    getBaseUrl = (channelId, params) => `https://discord.com/api/v9/channels/${channelId}/messages${params}`;

    getHeaders() {
        return {
            "Authorization": this.#_authToken
        }
    };

    messageCanBeDeleted = (m) => m.author.id === this.authorId && m.type !== 3;
    wait = async (ms) => new Promise(done => setTimeout(done, ms));

    constructor(authToken, authorId) {
        this.#_authToken = authToken;
        this.authorId = authorId;
    }

    start(channelId, beforeMessageId = "") {
        this.fetchMessages(channelId, beforeMessageId, async ({body}) => {
            for (let i in body) {
                const message = body[i];

                if (this.messageCanBeDeleted(message)) {
                    process.stdout.write(`\x1b[34m[${message.timestamp.replace("T", " ").split(".")[0]}]: \x1b[0m${message.content}`);

                    await this.deleteMessage(channelId, message.id);

                    console.log("   \x1b[31m[DELETED]\x1b[0m");

                    await this.wait(750);
                }
            }

            if (body.length === 0) {
                console.log("Channel cleared");
            } else {
                this.start(channelId, body.at(-1).id);
            }
        });
    }

    async request(method, channelId, params) {
        return new Promise((resolve) => {
            request({
                url: this.getBaseUrl(channelId, params),
                method: method,
                headers: this.getHeaders(),
                json: true
            }, (error, response, result) => resolve(response));
        });
    }

    async fetchMessages(channelId, beforeMessageId, callback) {
        const response = await this.request("GET", channelId, beforeMessageId.length > 0 ? `?before=${beforeMessageId}` : "");

        if (response === undefined) return await this.fetchMessages(channelId, beforeMessageId, callback);
        if (response.statusCode === 202) {
            if (typeof response.retry_after === "number")
                await this.wait(response.retry_after * 1000);

            console.log("Indexing channel");

            return await this.fetchMessages(channelId, beforeMessageId, callback);
        }

        if (response.statusCode !== 200) {
            return console.log("Response status non OK - Stop fetching");
        }

        callback(response);
    }

    async deleteMessage(channelId, messageId) {
        const response = await this.request("delete", channelId, `/${messageId}`);

        if (response === undefined) return await this.deleteMessage(channelId, messageId);
        if (response.body && response.body.retry_after !== undefined) {
            await this.wait(response.body.retry_after * 1000);
            return await this.deleteMessage(channelId, messageId);
        }
    }
}

module.exports = ClearMessagesManager;