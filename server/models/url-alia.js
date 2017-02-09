/**
 * Url alias Model
 *
 * @module      :: Model
 */

module.exports = function UrlSlugModel(we) {
  return {
    definition: {
      // url to
      alias: {
        type: we.db.Sequelize.TEXT,
        allowNull: false,
        formFieldType: 'text',
        isURL: true,
        uniqueAliasName(val, cb) {
          if(val) return cb();
          return we.db.models.urlAlias
          .findOne({
            where: { alias: val }, attributes: ['id']
          })
          .then( (r)=> {
            if (r) return cb('urlAlias.alias.not-unique');
            cb();
            return null;
          })
          .catch(cb);
        }
      },
      // url from
      target: {
        type: we.db.Sequelize.TEXT,
        allowNull: false,
        formFieldType: 'text',
        isURL: true,
        uniqueTargetName(val, cb) {
          if(!val) return cb();
          return we.db.models.urlAlias
          .findOne({
            where: {
              target: val
            },
            attributes: ['id']
          })
          .then( (r)=> {
            if (r) return cb('urlAlias.target.not-unique');
            cb();
            return null;
          })
          .catch(cb);
        }
      },
      locale: {
        type: we.db.Sequelize.STRING,
        formFieldType: null
      }
    },
    options: {
      enableAlias: false,
      tableName: 'urlAlias'
    }
  };
};