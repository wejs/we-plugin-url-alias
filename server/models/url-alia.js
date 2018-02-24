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
    associations: {},
    options: {
      enableAlias: false,
      tableName: 'urlAlias',

      hooks: {
        beforeValidate(record) {
          if (record.alias && typeof record.alias == 'string') {
            record.alias = decodeURIComponent(record.alias);
            if (record.alias[0] != '/') record.alias = '/'+record.alias;
          }

          if (record.target && typeof record.target == 'string') {
            record.target = decodeURIComponent(record.target);
            if (record.target[0] != '/') record.target = '/'+record.target;
          }
        }
      }
    }
  };
};