const request = require("request");

function clear(authToken, authorId, channelId) {
    const wait = async (ms) => new Promise(done => setTimeout(done, ms));

    const headers = {
        "Authorization": authToken
    };

    const recurse = (before) => {
    	let params = before ? `?before=${before}` : ``;

    	request({
			url: `https://discord.com/api/v9/channels/${channelId}/messages${params}`,
		    headers: headers,
		    json: true
		}, async (error, response, result) => {
			if (response === undefined) {
				return recurse(before);
			}

			if (response.statusCode === 202) {
		        const w = response.retry_after;
		        
		        console.log(`This channel wasn't indexed, waiting ${w} ms for discord to index it...`);
		        
		        await wait(w);

		        return recurse(before);
		    }

		    if (response.statusCode !== 200) {
		        return console.log('API respondend with non OK status!', result);
		    }

		    for (let i in result) {
		    	let message = result[i];

		    	if (message.author.id === authorId && message.type !== 3) {
		    		await new Promise((resolve) => {
		    			console.log(`[${message.timestamp.replace("T", " ").split(".")[0]}]`, message.content);

		    			const startedAt = Date.now();

		    			const deleteRecurse = () => {
		    				request.delete({
								url: `https://discord.com/api/v9/channels/${channelId}/messages/${message.id}`,
							    headers: headers,
							    json: true
							}, async (error, response, result) => {
								if (error) {
									console.log(error);

									return deleteRecurse();
								}
								if (result) {
									console.log(result);

									if (result.retry_after !== undefined) {
										await wait(result.retry_after * 1000);
										return deleteRecurse();
									}
								}

								console.log("Deleted", `[Ping ${Date.now() - startedAt}ms]`);

								setTimeout(() => {
									resolve();
								}, 750);
						});
		    			}

		    			deleteRecurse();
		    		});
		    	}
		    }

		    if (result.length === 0) {
		    	console.log("Channel cleared");
		    } else {
		    	recurse(result[result.length - 1].id);
		    }
		});
    }

	recurse();
}

clear("YOUR_TOKEN", process.argv[2], process.argv[3]);
