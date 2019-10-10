import { Router } from 'express';
import Helper from '../helpers/helper';
import ArticleController from '../controllers/articleController';
import Validation from '../helpers/validation';

const router = Router();

router.get('/', Helper.verifyToken, ArticleController.getArticles);
router.post('/', Helper.verifyToken, Validation.validateArticle, ArticleController.newArticle);
router.get('/:articleID', Helper.verifyToken, ArticleController.getSingleArticle);

export default router;
