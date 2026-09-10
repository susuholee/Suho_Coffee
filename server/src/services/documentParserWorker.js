const { fork } = require('child_process');

if (process.argv.includes('--document-parser-child')) {
  process.once('message', async ({ buffer, fileName }) => {
    let message;
    try { message = { result: await require('./fileParser').extractDocument(Buffer.from(buffer), fileName) }; }
    catch (error) { message = { error: error.message, permanent: true }; }
    process.send(message, () => process.disconnect());
  });
}

function parseInWorker(buffer, fileName) {
  return new Promise((resolve, reject) => {
    // PDF's native canvas dependency is unsafe to unload in Windows worker_threads.
    // A separate process also isolates native parser failures from the web server.
    const worker = fork(__filename, ['--document-parser-child'], {
      serialization: 'advanced', stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
      execArgv: ['--max-old-space-size=256'], windowsHide: true,
    });
    let response;
    const timer = setTimeout(() => {
      worker.kill();
      reject(Object.assign(new Error('문서 분석 시간이 초과되었습니다. 문서를 나눠 업로드하세요.'), { permanent: true }));
    }, 120000);
    worker.once('message', message => {
      response = message;
    });
    worker.once('error', error => { clearTimeout(timer); reject(error); });
    worker.once('exit', code => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error('문서 분석 프로세스가 종료되었습니다.'));
      else if (response?.error) reject(Object.assign(new Error(response.error), { permanent: response.permanent }));
      else if (response?.result) resolve(response.result);
      else reject(new Error('문서 분석 결과를 받지 못했습니다.'));
    });
    worker.send({ buffer, fileName }, error => { if (error) { clearTimeout(timer); worker.kill(); reject(error); } });
  });
}
module.exports = { parseInWorker };
