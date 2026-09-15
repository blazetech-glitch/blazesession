const mega = require("megajs");

const auth = {
    email: 'atarimo117@gmail.com',   //use your real vaild mega account email
    password: 'mwanafunzii1',  ////use your real vaild mega account password
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246'
};

const upload = (data, name) => {
    return new Promise((resolve, reject) => {
        let settled = false;

        const fail = (err) => {
            if (settled) return;
            settled = true;
            reject(err);
        };

        try {
            if (!auth.email || !auth.password || !auth.userAgent) {
                throw new Error("Missing required authentication fields");
            }

            const storage = new mega.Storage(auth, () => {
                const uploadStream = storage.upload({ name, allowUploadBuffering: true });

                uploadStream.once('error', fail);
                uploadStream.once('complete', (file) => {
                    file.link((err, url) => {
                        if (err) {
                            fail(err);
                            return;
                        }

                        settled = true;
                        storage.close();
                        resolve(url);
                    });
                });

                data.once('error', fail);
                data.pipe(uploadStream);
            });

            storage.once('error', fail);
        } catch (err) {
            fail(err);
        }
    });
};

module.exports = { upload };
