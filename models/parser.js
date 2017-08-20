'use strict';
module.exports = function(sequelize, DataTypes) {
  var Parser = sequelize.define('Parser', {
    key: DataTypes.STRING,
    value: DataTypes.TEXT
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return Parser;
};