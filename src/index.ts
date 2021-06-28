import readline from 'readline';
import crypto from 'crypto';
import fs from 'fs';

import colors from 'colors';

const algorithm = 'aes-192-cbc';
const salt = 'qwerty';

const iv = Buffer.from([
    0x00, 0x01, 0x02, 0x03,
    0x00, 0x01, 0x02, 0x03, 
    0x00, 0x01, 0x02, 0x03, 
    0x00, 0x01, 0x02, 0x03
]);

colors.setTheme({
    def: ['grey'],
    ask: ['green', 'bold'],
    err: ['red', 'underline'],
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

type FileDataType = {
    fileData: Buffer, 
    path: string
};

function askAction() {
    const question = [
        'What do you want to do?',
        '  - To decrypt type D.',
        '  - To encrypt type E',
        '',
        'Waiting your order: ',
    ].join('\n');

    return new Promise<string>((resolve, reject) => {
        function parseAction(action: string) {
            const isDecrypt = (action === 'D');
            const isEncrypt = (action === 'E');

            if (!isDecrypt && !isEncrypt) {
                // @ts-ignore
                console.log('\nInvalid action. Please read carefully...\n'.err);

                askAction().then((action) => {
                    resolve(action);
                });

                return;
            }

            if (isEncrypt) {
                // @ts-ignore
                console.log('\nYou decided to encrypt your data. Write a path of file...'.def);
            }

            if (isDecrypt) {
                // @ts-ignore
                console.log('\nYou decided to decrypt your data. Write a path of file...'.def);
            }

            resolve(action);
        }

        // @ts-ignore
        rl.question(question.ask, parseAction);
    });
}

function askFilePathAndRead() {
    return new Promise<FileDataType>((resolve, reject) => {
        async function parseFile(rawPath: string) {
            const path = rawPath.trim().replace(/'/g, '');

            try {
                const buffer = fs.readFileSync(path);

                resolve({
                    fileData: buffer,
                    path: path,
                });
            } catch (err) {
                console.error(err.message.err);
                console.log('\nTrying again...');

                resolve(askFilePathAndRead());
            }
        }

        // @ts-ignore
        rl.question('\nDrop file with which you want to work: '.ask, parseFile);
    });
}

function processFile(action: string, fileData: Buffer, path: string, password: string) {
    function decryptBuffer(binData: Buffer) {
        // @ts-ignore
        console.log('\nDecrypting secure data...'.def);

        const key = crypto.scryptSync(password, salt, 24);
        const decipher = crypto.createDecipheriv(algorithm, key, iv);

        let chunk: Buffer;

        let buffers: Buffer[] = [];

        decipher.on('readable', () => {
            while ( null !== ( chunk = decipher.read() ) ) {
                buffers.push(chunk);
            }
        });

        decipher.on('end', () => {
            fs.writeFileSync(path + '.dec', Buffer.concat(buffers));
        });

        decipher.write(binData);
        decipher.end();

        rl.close();
    }

    function encryptBuffer(binData: Buffer) {
        // @ts-ignore
        console.log('\nEncrypting your data...'.def);

        crypto.scrypt(password, salt, 24, (err, key) => {
            if (err) throw err;
        
            const cipher = crypto.createCipheriv(algorithm, key, iv);
        
            let buffers: Buffer[] = [];
        
            cipher.on('data', (chunk) => {
                buffers.push(chunk);
            });
            cipher.on('end', () => {
                fs.writeFileSync(path + '.enc', Buffer.concat(buffers))
            });
        
            cipher.write(binData);
            cipher.end();
        });

        rl.close();
    }

    switch (action) {
        case 'D': return decryptBuffer(fileData);
        case 'E': return encryptBuffer(fileData);
    }
}

function askPassword() {
    return new Promise<string>((resolve, reject) => {
        function readPassword(passwd: string) {
            resolve(passwd);
        }

        // @ts-ignore
        rl.question('\nInput your password: '.ask, readPassword);
    });
}

(async() => {
    const action = await askAction();
    const { fileData, path } = await askFilePathAndRead();
    const password = await askPassword();
    
    processFile(action, fileData, path, password);
})();