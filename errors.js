
function CustomError(property){
   Error.apply(this, arguments);
   this.name = 'CustomError';
   this.property = property;
   this.message = property;
   if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
   }  else {
      this.stack = (new Error()).stack;
   }
}
CustomError.prototype = Object.create(Error.prototype);
CustomError.prototype.constructor = CustomError;


function PageNotFound(property){
    CustomError.apply(this, arguments);
    this.name = PageNotFound;
    this.property = property;
    this.message = 'На сайте ' + property + ' такой страницы не существует';
}
PageNotFound.prototype = Object.create(CustomError.prototype);
PageNotFound.prototype.constructor = PageNotFound;

function ContentNotFound(property){
    CustomError.apply(this, arguments);
    this.name = PageNotFound;
    this.property = property;
    this.message = 'На обьекте ' + property + ' отсуствует контент';
}
PageNotFound.prototype = Object.create(CustomError.prototype);
PageNotFound.prototype.constructor = PageNotFound;

module.exports = {
    CustomError: CustomError,
    PageNotFound: PageNotFound,
    ContentNotFound: ContentNotFound
};