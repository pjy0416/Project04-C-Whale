const sequelize = require('@models');
const { isTaskOwner, isProjectOwner, isSectionOwner } = require('@services/authorization-check');
const errorMessage = require('@utils/error-messages');
const errorCode = require('@utils/error-codes');

const { models } = sequelize;
const taskModel = models.task;

const retrieveById = async ({ id, userId }) => {
  const task = await taskModel.findByPk(id, {
    include: [
      'labels',
      'priority',
      'alarm',
      'bookmarks',
      {
        model: taskModel,
        include: ['labels', 'priority', 'alarm', 'bookmarks'],
      },
    ],
    order: [[taskModel, 'position', 'ASC']],
  });

  // task가 없는 경우, url params로 넘어오는 taskId가 유효하지 않음
  if (!task) {
    const error = new Error(errorMessage.NOT_FOUND_ERROR('task'));
    error.status = errorCode.NOT_FOUND_ERROR;
    throw error;
  }

  // 요청받은 task가 해당 유저의 작업이 아닌 경우 리소스 접근 권한이 없음
  if (!(await isTaskOwner({ id, userId }))) {
    const error = new Error(errorMessage.FORBIDDEN_ERROR);
    error.status = errorCode.FORBIDDEN_ERROR;
    throw error;
  }
  return task;
};

const retrieveAll = async userId => {
  const task = await taskModel.findAll({
    where: { isDone: false },
    include: [
      'labels',
      'priority',
      'alarm',
      'bookmarks',
      {
        model: taskModel,
        include: ['labels', 'priority', 'alarm', 'bookmarks'],
      },
      {
        model: models.project,
        attributes: [],
        where: { creatorId: userId },
      },
    ],
    order: [[taskModel, 'position', 'ASC']],
  });
  return task;
};

const create = async ({ projectId, sectionId, userId, ...taskData }) => {
  const { labelIdList, dueDate, ...rest } = taskData;

  const project = await models.project.findByPk(projectId);
  if (!project) {
    const error = new Error(errorMessage.NOT_FOUND_ERROR('project'));
    error.status = errorCode.NOT_FOUND_ERROR;
    throw error;
  }
  if (!(await isProjectOwner({ id: projectId, userId }))) {
    const error = new Error(errorMessage.FORBIDDEN_ERROR);
    error.status = errorCode.FORBIDDEN_ERROR;
    throw error;
  }

  const result = await sequelize.transaction(async t => {
    const section = await models.section.findByPk(sectionId, { include: 'tasks' });
    if (!section) {
      const error = new Error(errorMessage.NOT_FOUND_ERROR('section'));
      error.status = errorCode.NOT_FOUND_ERROR;
      throw error;
    }
    if (!(await isSectionOwner({ id: sectionId, userId }))) {
      const error = new Error(errorMessage.FORBIDDEN_ERROR('section'));
      error.status = errorCode.NOT_FOUND_ERROR;
      throw error;
    }

    if (section.projectId !== projectId) {
      const error = new Error(errorMessage.WRONG_RELATION_ERROR('project, section'));
      error.status = errorCode.BAD_REQUEST_ERROR;
      throw error;
    }

    const maxPosition = section.toJSON().tasks.reduce((max, task) => {
      return Math.max(max, task.position);
    }, 0);

    const task = await models.task.create(
      { projectId, sectionId, dueDate, position: maxPosition + 1, ...rest },
      { transaction: t },
    );
    if (labelIdList) {
      await task.setLabels(JSON.parse(labelIdList), { transaction: t });
    }

    return task;
  });

  return !!result;
};

const update = async taskData => {
  const { id, labelIdList, dueDate, userId, ...rest } = taskData;

  const result = await sequelize.transaction(async t => {
    try {
      const task = await taskModel.findByPk(id, { transaction: t });
      if (!task) {
        const error = new Error(errorMessage.NOT_FOUND_ERROR('task'));
        error.status = errorCode.NOT_FOUND_ERROR;
        throw error;
      }

      // 요청받은 task가 해당 유저의 작업이 아닌 경우 리소스 접근 권한이 없음
      if (!(await isTaskOwner({ id, userId }))) {
        const error = new Error(errorMessage.FORBIDDEN_ERROR);
        error.status = errorCode.FORBIDDEN_ERROR;
        throw error;
      }

      await task.update({ dueDate, ...rest });
      if (labelIdList) {
        await task.setLabels(JSON.parse(labelIdList), { transaction: t });
      }
      task.save();
      return true;
    } catch (err) {
      t.rollback();
      throw err;
    }
  });

  return result;
};

const remove = async id => {
  const result = await taskModel.destroy({
    where: {
      id,
    },
  });

  return result;
};

module.exports = { retrieveById, retrieveAll, create, update, remove };
