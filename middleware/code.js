const UniqueCode = require('../models').UniqueCode;
const generateCode = require('../utils/generateCode');
const Tasks = require('../db/tasks');

exports.withAll = (req, res, next) => {
  UniqueCode
    .query(function (qb) {
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 1000;
      const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
      const search = req.query.search ? req.query.search : false;

      if (req.query.clientId) {
        qb.where('clientId',  req.client.id);
      }

      if (search) {
        qb.where('code', 'like', '%' +search+ '%')
      }

      qb.limit(limit);
      qb.offset(offset);
      qb.orderBy('id', 'DESC');

    })
    .fetchAll()
    .then((codes) => {
       req.codesCollection = codes;
       req.codes = codes.serialize();

       return UniqueCode
        .query((qb) => {
          qb.where('clientId',  req.client.id)
        })
        .count("id");
    //    .first();
    })
    .then((total) => {
      req.totalCodeCount = total;
      next();
    })
    .catch((err) => { next(err); });
}

exports.withOne = (req, res, next) => {
  const codeId = req.body.codeId ? req.body.codeId : req.params.codeId;

  new UniqueCode({ id: codeId })
    .fetch()
    .then((code) => {
      req.codeModel = code;
      req.code = code.serialize();
      next();
    })
    .catch((err) => { next(err); });
}


exports.create = async (req, res, next) => {

  const promises = [];
  const amountOfCodes = req.query.amount ? req.query.amount : 1;

  const amountOfCodesPerSecond = 250; // TODO: configurable

  // use tasks to keep track of the process
  let task = await Tasks.save(null, { amountOfCodes, generatedCodes: 0 });
  let taskId = req.taskId = task.taskId;

  // go on with response now; creating codes is done in the background
  next(null, { taskId });

  // create codes
  for (let i = 0; i < amountOfCodes; i++) {
    await new Promise((resolve, reject) => {
      setTimeout(function() {
        return new UniqueCode({
          code: generateCode(),
          clientId: req.client.id
        })
          .save()
          .then(result => {
            task.generatedCodes++;
            return Tasks.save(taskId, task);
          })
          .then(result => resolve() )
          .catch( async err => {
            task.error = err;
            await Tasks.save(taskId, task);
            reject(err)
          })
      }, 1000 / amountOfCodesPerSecond)
    })
      .catch(function (err) {
        throw err;
      });
  };

}

exports.reset = (req, res, next) => {
  const { userId } = req.body;
  req.codeModel.set('userId', null);

  req.codeModel
    .save()
    .then((code) => {
      next();
    })
    .catch((err) => {
      console.log('update err', err);
      next(err);
    })
}

exports.deleteOne = (req, res, next) => {
  req.codeModel
    .destroy()
    .then(() => {
      next();
    })
    .catch((err) => { next(err); });
}
