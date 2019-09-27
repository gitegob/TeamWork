import { Router } from 'express';

import Helper from '../helpers/helper';

import ArticleController from '../controllers/articleController';

const router = Router();

router.get('/', Helper.verifyToken, ArticleController.getArticles);

router.post('/', Helper.verifyToken, ArticleController.newArticle);

router.post('/:articleID', Helper.verifyToken, ArticleController.getSingleArticle);

router.post('/:articleID', Helper.verifyToken, ArticleController.shareArticle);

router.patch('/:articleID', Helper.verifyToken, ArticleController.updateArticle);

router.post('/:articleID/comments', Helper.verifyToken, ArticleController.postComment);

export default router;
