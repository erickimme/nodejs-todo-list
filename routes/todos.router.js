import express from "express";
import joi from "joi";
import Todo from "../schemas/todo.schema.js ";

const router = express.Router();

/* Joi유효성 검사 */
// - value 데이터 - 필수적으로 존재
// - value 데이터 - 문자열
// - value 데이터 최소 1글자, 최대 50글자
// - validate 실패했을 때 error

const createdTodoSchema = joi.object({
  value: joi.string().min(1).max(50).required(),
});

/** 할일 등록 API */
router.post("/todos", async (req, res, next) => {
  try {
    // 1. 클라이언트로부터 받아온 value 데이터를 가져온다.
    // const { value } = req.body;

    const validation = await createdTodoSchema.validateAsync(req.body);
    const { value } = validation;

    // 1-5. 만약 클라이언트가 value 데이터를 전달하지 않았을 때, 클라이언트에게 에러 메시지를 전달한다.
    if (!value) {
      return res
        .status(400)
        .json({ errorMessage: "해야할 일(value) 데이터가 존재하지 않습니다." });
    }

    // 2. 해당하는 마지막 order 데이터를 조회한다.
    // todo.schema.js 의 model 을 통해서 가져왔다.
    // findOne 은 1개의 데이터만 조회.
    // sort 은 정렬한다. -> 어떤 컬럼을?
    const todoMaxorder = await Todo.findOne().sort("-order").exec();

    // 3. 만약 존재한다면 현재 해야할 일을 +1 하고, Order 데이터가 존재하지 않다면 1로 할당한다
    const order = todoMaxorder ? todoMaxorder.order + 1 : 1;

    // 4. 해야할 일 등록
    const todo = new Todo({ value, order }); // instance
    await todo.save(); // 실제로 데이터 베이스에 저장

    // 5. 해야할 일을 클라이언트에게 반환한다.
    return res.status(201).json({ todo: todo });
  } catch (error) {
    // * error-handler.middleware.js 로 이동 */
    // console.error(error);
    // // 예상한 에러인지 아닌지 검증
    // if (error.name === "ValidationError") {
    //     return res.status(400).json({ errorMessage: error.message });
    // }

    // return res.status(500).json({ errorMessage: "서버에서 에러가 발생했습니다." }); // 서버에서 문제가 발생

    // router 다음에 있는 에러 처리(error-handler middleware) 미들웨어를 호출한다.
    next(error);
  }
});

/** 해야할 일 목록 조회 API */
router.get("/todos", async (req, res, next) => {
  // 1. 해야할 일 목록 조회
  // todos.schema.js의 Todo 모델을 사용함
  const todos = await Todo.find().sort("-order").exec();

  // 2. 해야할 일 목록 조회 결과를 클라이언트에게 반환한다.
  return res.status(200).json({ todos });
});

// const TodoSchema = new mongoose.Schema({
//     // 해야할 일
//       value: {
//       type: String,
//       required: true, // value 필드는 필수 요소입니다.
//     },
//     // 할일의 순서
//     order: {
//       type: Number,
//       required: true, // order 필드 또한 필수 요소입니다.
//     },
//     // 완료 시점 timestamp
//     doneAt: {
//       type: Date, // doneAt 필드는 Date 타입을 가집니다.
//       required: false, // doneAt 필드는 필수 요소가 아닙니다.
//     },
//   });

/** 해야할 일 업데이트 (할일 순서, 완료/해제, 할일 변경) API */
router.patch("/todos/:todoId", async (req, res, next) => {
  // Todo ID를 가져온다.
  const { todoId } = req.params;
  const { order, done, value } = req.body;

  // 현재 나의 order가 무엇인지 알아야한다.
  const currentTodo = await Todo.findById(todoId).exec();
  // error message - 클라이언트가 전달한 투두가 없을 경우 에러메시지 반환
  if (!currentTodo) {
    return res
      .status(404)
      .json({ errorMessage: "존재하지 않는 해야할 일 입니다." });
  }
  // order가 존재한다면
  if (order) {
    const targetTodo = await Todo.findOne({ order }).exec(); // 바꾸길 희망하는 order에 데이터가 존재하는지 확인
    // 희망 order에 데이터가 존재한다면, swap을 해라.
    if (targetTodo) {
      targetTodo.order = currentTodo.order;
      await targetTodo.save();
    }
    currentTodo.order = order;
  }

  // 2. 완료/해제, 시간 추가
  // 완료가 없는 것이 아니면 UTC 포맷의 현재 시간을 할당한다.
  if (done != undefined) {
    currentTodo.doneAt = done ? new Date() : null;
  }

  // 3. 할일 내용 변경
  if (value) {
    currentTodo.value = value;
  }

  // 변경된 투두를 보낸다.
  await currentTodo.save();

  return res.status(200).json({});
});

/** 해야할 일 삭제 API */
router.delete("/todos/:todoId", async (req, res, next) => {
  const { todoId } = req.params;
  const todo = await Todo.findById(todoId).exec();
  // todo가 없다면 에러 메시지
  if (!todo) {
    return res
      .status(404)
      .json({ errorMessage: "존재하지 않는 해야할 일 정보입니다." });
  }
  await Todo.deleteOne({ _id: todoId });

  return res.status(200).json({});
});

export default router;
