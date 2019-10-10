/* eslint-disable no-throw-literal */
import pool from '../database/dbConnect';
import Helper from '../helpers/helper';
import schema from '../helpers/joiValidation';

class ArticleController {
	async getArticles(_req, res) {
		const query = `
    SELECT * FROM articles ORDER BY createdon DESC;
    `;
		try {
			const result = await pool.query(query);
			res.status(200).send({
				status: 200,
				message: 'All articles',
				data: {
					articles: result.rows
				}
			});
		} catch (err) {
			res.status(500).send({
				status: 500,
				error: err.message
			});
		}
	}

	async newArticle(req, res) {
		const { title, article } = req.body;
		const { firstName, lastName, id: authorId } = req.payload;
		const authorName = `${firstName} ${lastName}`;
		const query = `
        INSERT INTO articles (authorid, authorname, title, article)
        VALUES ($1,$2, $3, $4) RETURNING *;
        `;
		const values = [authorId, authorName, title, article];
		try {
			const result = await pool.query(query, values);
			const {
				id, title, article, authorid: authorId, authorname: authorName
			} = result.rows[0];
			res.status(201).send({
				status: 201,
				message: 'Article successfully created',
				data: {
					id, title, article, authorId, authorName
				}
			});
		} catch (err) {
			res.status(500).send({ status: 500, error: err.message });
		}
	}

	async getSingleArticle(req, res) {
		const query = `
        SELECT * FROM articles
        WHERE id = $1`;
		const values = [req.params.articleID];
		try {
			const result = await pool.query(query, values);
			if (result.rows[0]) {
				const comments = await Helper.findComments(req.params.articleID);
				const {
					id, authorid: authorId, authorname: authorName, title, article, createdon: createdOn
				} = result.rows[0];
				return res.status(200).send({
					status: 200,
					message: 'Success',
					data: {
						Article: {
							id, authorId, authorName, title, article, createdOn
						},
						Comments: comments
					}
				});
			}
			return res.status(404).send({
				status: 404,
				error: 'Article not found'
			});
		} catch (err) {
			return res.status(500).send({
				status: 500,
				error: err.message
			});
		}
	}

	async updateArticle(req, res) {
		const { title, article } = req.body;
		const articleToUpdate = await Helper.findOne(req.params.articleID, 'articles');
		const newTitle = title || articleToUpdate.title;
		const newArticle = article || articleToUpdate.article;
		const query = `
                UPDATE articles SET title = $1, article = $2 WHERE id = $3 RETURNING *;
                `;
		const values = [newTitle, newArticle, req.params.articleID];
		try {
			const result = await pool.query(query, values);
			const {
				id, authorid: authorId, authorname: authorName, createdon: createdOn
			} = result.rows[0];
			return res.status(200).send({
				status: 200,
				message: 'Article successfully edited',
				data: {
					article: {
						id, authorId, authorName, title, article, createdOn
					}
				}
			});
		} catch (err) {
			return res.status(500).send({
				status: 500,
				error: err.message
			});
		}
	}

	async deleteArticle(req, res) {
		const { articleID } = req.params;
		const article = await Helper.findOne(articleID, 'articles');
		const { id, isAdmin } = req.payload.id;
		if (article) {
			const flags = await Helper.findFlags(articleID, 'article', res);
			if (flags || id === article.authorId) {
				const query = `
			DELETE FROM articles WHERE id = $1;
			`;
				const values = [articleID];
				try {
					const result = await pool.query(query, values);

					return res.status(200).send({ status: 200, message: 'Article successfully deleted' });
				} catch (err) {
					res.status(500).send({ status: 500, error: err.message });
				}
			} else {
				try {
					if ((flags.length < 1) && isAdmin) throw 'Cannot delete an unflagged commment';
					else throw 'Not Authorized';
				} catch (err) {
					return res.status(403).send({ status: 403, error: err.message });
				}
			}
		} else return res.status(404).send({ status: 404, error: 'Article not found' });
	}

	async postComment(req, res) {
		const { comment } = req.body;
		const { error } = schema.commentSchema.validate({
			comment
		});
		try {
			if (error) {
				if (error.details[0].type === 'any.required') {
					throw "You didn't write anything";
				} else throw error.details[0].message.replace(/[/"]/g, '');
			}
		} catch (err) {
			return res.status(400).send({
				status: 400,
				error: err
			});
		}
		const authorId = req.payload.id;
		const article = await Helper.findOne(req.params.articleID, 'articles');
		if (article) {
			const matches = await Helper.findComments(req, res, req.params.articleID);
			const match = matches.find((el) => el.comment === comment);
			if (match) {
				res.status(409).send({
					status: 409,
					error: 'Comment already exists'
				});
			} else {
				const query = `
				INSERT INTO comments (authorid, articleid, comment) VALUES ($1, $2, $3) RETURNING *;
				`;
				const values = [authorId, req.params.articleID, comment];
				try {
					const result = await pool.query(query, values);
					const {
						id, authorid: authorId, articleid: articleId, comment, postedon: postedOn
					} = result.rows[0];
					return res.status(201).send({
						status: 201,
						message: 'Comment posted successfully',
						data: {
							articleTitle: article.title,
							article: article.article,
							comment: {
								id, authorId, articleId, comment, postedOn
							}
						}

					});
				} catch (err) {
					return res.status(500).send({
						status: 500,
						error: err.message
					});
				}
			}
		} else {
			res.status(404).send({
				status: 404,
				error: 'Article not found'
			});
		}
	}
}

export default new ArticleController();
